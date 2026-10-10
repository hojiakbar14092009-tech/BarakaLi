import { sql } from 'kysely';
import {
  ORDER_STATUS_TRANSITIONS,
  canTransition,
  type AdminOrderDetailDto,
  type OrderStatus,
  type PaymentStatus,
  type RefundDto,
} from '@barakali/shared';
import type { AppContext } from '../../context.js';
import { AppError } from '../../errors.js';
import { refundPaidOrder } from '../payments/payment.service.js';
import { writeAudit } from './audit.js';

export class AdminOrdersService {
  constructor(
    private readonly ctx: AppContext,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async get(orderId: string): Promise<AdminOrderDetailDto> {
    const db = this.ctx.db;
    const order = await db
      .selectFrom('orders as o')
      .innerJoin('workers as w', 'w.id', 'o.worker_id')
      .innerJoin('users as wu', 'wu.id', 'w.user_id')
      .innerJoin('users as cu', 'cu.id', 'o.customer_id')
      .select([
        'o.id',
        'o.type',
        'o.status',
        'o.total',
        'o.commission_amount',
        'o.commission_rate',
        'o.worker_amount',
        'o.fulfillment',
        'o.delivery_address',
        'o.start_time',
        'o.end_time',
        'o.description',
        'o.created_at',
        'o.updated_at',
        'cu.id as customer_id',
        'cu.name as customer_name',
        'cu.phone as customer_phone',
        'w.id as worker_id',
        'w.display_name as worker_name',
        'wu.phone as worker_phone',
        sql<PaymentStatus | null>`(select p.status from payments p where p.order_id = o.id order by p.created_at desc limit 1)`.as(
          'payment_status',
        ),
      ])
      .where('o.id', '=', orderId)
      .executeTakeFirst();
    if (!order) throw AppError.notFound();
    const [items, refunds] = await Promise.all([
      db
        .selectFrom('order_items')
        .select(['id', 'product_id', 'title_snapshot', 'unit_price', 'quantity', 'price_type'])
        .where('order_id', '=', orderId)
        .execute(),
      db
        .selectFrom('refunds as r')
        .leftJoin('users as a', 'a.id', 'r.admin_user_id')
        .select([
          'r.id',
          'r.amount',
          'r.commission_reversed',
          'r.reason',
          'r.created_at',
          'a.name as admin_name',
        ])
        .where('r.order_id', '=', orderId)
        .orderBy('r.created_at', 'desc')
        .execute(),
    ]);
    const status = order.status as OrderStatus;
    return {
      id: order.id,
      type: order.type,
      status,
      total: order.total,
      commission: order.commission_amount,
      commissionRate: Number(order.commission_rate),
      workerAmount: order.worker_amount,
      fulfillment: order.fulfillment,
      deliveryAddress: order.delivery_address,
      startTime: order.start_time?.toISOString() ?? null,
      endTime: order.end_time?.toISOString() ?? null,
      description: order.description,
      customer: { id: order.customer_id, name: order.customer_name, phone: order.customer_phone },
      worker: { id: order.worker_id, name: order.worker_name, phone: order.worker_phone },
      paymentStatus: order.payment_status,
      items: items.map((item) => ({
        id: item.id,
        productId: item.product_id,
        title: item.title_snapshot,
        unitPrice: item.unit_price,
        quantity: item.quantity,
        priceType: item.price_type,
      })),
      refunds: refunds.map(toRefundDto),
      // Refunds go through their own endpoint, with the money movement.
      allowedTransitions: ORDER_STATUS_TRANSITIONS[status].filter((next) => next !== 'refunded'),
      createdAt: order.created_at.toISOString(),
      updatedAt: order.updated_at.toISOString(),
    };
  }

  /** Only the transitions in ORDER_STATUS_TRANSITIONS; anything else is 409, never a silent write. */
  async setStatus(adminId: string, orderId: string, target: OrderStatus): Promise<void> {
    if (target === 'refunded') throw AppError.conflict('ORDER_INVALID_TRANSITION');
    await this.ctx.db.transaction().execute(async (trx) => {
      const order = await trx
        .selectFrom('orders')
        .select(['status', 'worker_id', 'worker_amount', 'commission_amount'])
        .where('id', '=', orderId)
        .forUpdate()
        .executeTakeFirst();
      if (!order) throw AppError.notFound();
      const from = order.status as OrderStatus;
      if (!canTransition(from, target)) throw AppError.conflict('ORDER_INVALID_TRANSITION');
      if (target === 'delivered' && order.worker_amount > 0) {
        await trx
          .insertInto('earnings')
          .values({
            order_id: orderId,
            worker_id: order.worker_id,
            amount: order.worker_amount,
            commission: order.commission_amount,
          })
          .execute();
      }
      await trx
        .updateTable('orders')
        .set({ status: target, updated_at: this.now() })
        .where('id', '=', orderId)
        .execute();
      await writeAudit(trx, {
        adminId,
        action: 'order.status',
        targetType: 'order',
        targetId: orderId,
        details: { from, to: target },
      });
    });
  }

  /**
   * Money back in one transaction: provider refund, payment -> refunded, stock restored, a refunds
   * ledger row, the commission reversed if earnings were already recorded, the order -> refunded,
   * and the audit entry. Amounts are whole som taken from the payment, never from the client.
   */
  async refund(adminId: string, orderId: string, reason: string | null): Promise<RefundDto> {
    const created = await this.ctx.db.transaction().execute(async (trx) => {
      const order = await trx
        .selectFrom('orders')
        .select(['id', 'status', 'worker_id', 'worker_amount', 'commission_amount'])
        .where('id', '=', orderId)
        .forUpdate()
        .executeTakeFirst();
      if (!order) throw AppError.notFound();
      if (!canTransition(order.status as OrderStatus, 'refunded')) {
        throw AppError.conflict('ORDER_NOT_REFUNDABLE');
      }
      const payment = await trx
        .selectFrom('payments')
        .select(['id', 'amount'])
        .where('order_id', '=', orderId)
        .where('status', '=', 'paid')
        .executeTakeFirst();
      if (!payment) throw AppError.conflict('ORDER_NOT_REFUNDABLE');
      await refundPaidOrder(trx, this.ctx.payments, orderId);

      const earned = await trx
        .selectFrom('earnings')
        .select('id')
        .where('order_id', '=', orderId)
        .executeTakeFirst();
      const commissionReversed = earned ? order.commission_amount : 0;
      if (earned) {
        await trx
          .insertInto('earnings')
          .values({
            order_id: orderId,
            worker_id: order.worker_id,
            amount: -order.worker_amount,
            commission: -order.commission_amount,
          })
          .execute();
      }
      const row = await trx
        .insertInto('refunds')
        .values({
          order_id: orderId,
          payment_id: payment.id,
          amount: payment.amount,
          commission_reversed: commissionReversed,
          reason,
          admin_user_id: adminId,
        })
        .returning(['id', 'amount', 'commission_reversed', 'reason', 'created_at'])
        .executeTakeFirstOrThrow();
      await trx
        .updateTable('orders')
        .set({ status: 'refunded', updated_at: this.now() })
        .where('id', '=', orderId)
        .execute();
      await writeAudit(trx, {
        adminId,
        action: 'order.refund',
        targetType: 'order',
        targetId: orderId,
        details: {
          from: order.status,
          amount: payment.amount,
          commissionReversed,
          reason,
        },
      });
      return row;
    });
    return toRefundDto({ ...created, admin_name: null });
  }
}

function toRefundDto(row: {
  id: string;
  amount: number;
  commission_reversed: number;
  reason: string | null;
  created_at: Date;
  admin_name: string | null;
}): RefundDto {
  return {
    id: row.id,
    amount: row.amount,
    commissionReversed: row.commission_reversed,
    reason: row.reason,
    adminName: row.admin_name,
    createdAt: row.created_at.toISOString(),
  };
}
