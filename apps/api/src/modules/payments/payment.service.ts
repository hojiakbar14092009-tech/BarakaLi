import type { Transaction } from 'kysely';
import type { CardPaymentInput, OrderDto, PaymentSessionDto } from '@barakali/shared';
import type { AppContext } from '../../context.js';
import type { Database } from '../../db/schema.js';
import { AppError } from '../../errors.js';
import { OrderRepository } from '../orders/order.repository.js';

/** Returns reserved stock to the shelf when a paid order is refunded. */
export async function restoreStock(trx: Transaction<Database>, orderId: string): Promise<void> {
  const items = await trx
    .selectFrom('order_items')
    .select(['product_id', 'quantity'])
    .where('order_id', '=', orderId)
    .execute();
  for (const item of items) {
    if (!item.product_id) continue;
    await trx
      .updateTable('products')
      .set((eb) => ({ stock: eb('stock', '+', item.quantity) }))
      .where('id', '=', item.product_id)
      .execute();
  }
}

/** Atomic guard against overselling: the update only succeeds while enough stock remains. */
async function reserveStock(trx: Transaction<Database>, orderId: string): Promise<void> {
  const items = await trx
    .selectFrom('order_items')
    .select(['product_id', 'quantity'])
    .where('order_id', '=', orderId)
    .execute();
  for (const item of items) {
    if (!item.product_id) throw AppError.conflict('PRODUCT_UNAVAILABLE');
    const result = await trx
      .updateTable('products')
      .set((eb) => ({ stock: eb('stock', '-', item.quantity) }))
      .where('id', '=', item.product_id)
      .where('stock', '>=', item.quantity)
      .executeTakeFirst();
    if (Number(result.numUpdatedRows) !== 1) throw AppError.conflict('INSUFFICIENT_STOCK');
  }
}

export class PaymentService {
  private readonly orders: OrderRepository;

  constructor(private readonly ctx: AppContext) {
    this.orders = new OrderRepository(ctx.db);
  }

  /** Creates (or returns) the pending payment for an order the customer still has to pay. */
  async start(customerId: string, orderId: string): Promise<PaymentSessionDto> {
    const order = await this.ctx.db
      .selectFrom('orders')
      .select(['id', 'customer_id', 'status', 'total'])
      .where('id', '=', orderId)
      .executeTakeFirst();
    if (!order || order.customer_id !== customerId) throw AppError.notFound();
    const existing = await this.findPayment(orderId);
    if (existing?.status === 'paid') throw AppError.conflict('PAYMENT_ALREADY_PAID');
    if (order.status !== 'awaiting_payment') throw AppError.conflict('ORDER_NOT_PAYABLE');
    const payment = existing ?? (await this.createPending(orderId, order.total));
    return {
      paymentId: payment.id,
      orderId,
      amount: payment.amount,
      status: payment.status,
      redirectUrl: `/tolov/${orderId}`,
    };
  }

  /** Provider callback: idempotent, so a repeated confirmation never reserves stock twice. */
  async confirm(customerId: string, orderId: string, card: CardPaymentInput): Promise<OrderDto> {
    const outcome = await this.ctx.db.transaction().execute(async (trx) => {
      const order = await trx
        .selectFrom('orders')
        .select(['id', 'customer_id', 'status', 'total'])
        .where('id', '=', orderId)
        .forUpdate()
        .executeTakeFirst();
      if (!order || order.customer_id !== customerId) throw AppError.notFound();
      const payment = await trx
        .selectFrom('payments')
        .selectAll()
        .where('order_id', '=', orderId)
        .forUpdate()
        .executeTakeFirst();
      if (!payment) throw AppError.conflict('ORDER_NOT_PAYABLE');
      if (payment.status === 'paid') return 'already-paid' as const;
      if (order.status !== 'awaiting_payment') throw AppError.conflict('ORDER_NOT_PAYABLE');
      const result = await this.ctx.payments.verifyCallback(card, { orderId, amount: order.total });
      if (result.status === 'failed') return 'declined' as const;
      await reserveStock(trx, orderId);
      await trx
        .updateTable('payments')
        .set({ status: 'paid', provider_ref: result.providerRef })
        .where('id', '=', payment.id)
        .execute();
      await trx
        .updateTable('orders')
        .set({ status: 'new', updated_at: new Date() })
        .where('id', '=', orderId)
        .execute();
      return 'paid' as const;
    });
    if (outcome === 'declined') throw new AppError('PAYMENT_DECLINED', 402);
    const [dto] = await this.orders.findDtos([orderId], {
      userId: customerId,
      workerId: undefined,
    });
    if (!dto) throw AppError.notFound();
    return dto;
  }

  private findPayment(orderId: string) {
    return this.ctx.db
      .selectFrom('payments')
      .selectAll()
      .where('order_id', '=', orderId)
      .executeTakeFirst();
  }

  private async createPending(orderId: string, amount: number) {
    const created = await this.ctx.payments.createPayment({ orderId, amount });
    await this.ctx.db
      .insertInto('payments')
      .values({
        order_id: orderId,
        amount,
        provider: this.ctx.payments.name,
        provider_ref: created.providerRef,
        idempotency_key: `order:${orderId}`,
      })
      .onConflict((oc) => oc.column('idempotency_key').doNothing())
      .execute();
    const payment = await this.findPayment(orderId);
    if (!payment) throw AppError.notFound();
    return payment;
  }
}
