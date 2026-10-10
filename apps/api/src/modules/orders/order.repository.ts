import type { Selectable } from 'kysely';
import {
  PHONE_VISIBLE_STATUSES,
  type ComplaintDto,
  type OrderDto,
  type OrderItemDto,
  type OrderStatus,
  type PaymentStatus,
  type ReviewDto,
} from '@barakali/shared';
import type { Db } from '../../db/client.js';
import type { OrdersTable } from '../../db/schema.js';

export type OrderRow = Selectable<OrdersTable>;

export interface OrderViewer {
  userId: string;
  workerId: string | undefined;
}

export class OrderRepository {
  constructor(private readonly db: Db) {}

  async listIdsForCustomer(userId: string): Promise<string[]> {
    const rows = await this.db
      .selectFrom('orders')
      .select('id')
      .where('customer_id', '=', userId)
      .orderBy('created_at', 'desc')
      .limit(50)
      .execute();
    return rows.map((row) => row.id);
  }

  async listIdsForWorker(workerId: string): Promise<string[]> {
    const rows = await this.db
      .selectFrom('orders')
      .select('id')
      .where('worker_id', '=', workerId)
      .where('status', '!=', 'awaiting_payment')
      .orderBy('created_at', 'desc')
      .limit(50)
      .execute();
    return rows.map((row) => row.id);
  }

  /** One order query, one items query (IN) and one payments query (IN) for any number of orders. */
  async findDtos(ids: string[], viewer: OrderViewer): Promise<OrderDto[]> {
    if (ids.length === 0) return [];
    const [orders, items, payments, reviews, complaints] = await Promise.all([
      this.db
        .selectFrom('orders as o')
        .innerJoin('workers as w', 'w.id', 'o.worker_id')
        .innerJoin('users as wu', 'wu.id', 'w.user_id')
        .innerJoin('users as cu', 'cu.id', 'o.customer_id')
        .select([
          'o.id',
          'o.type',
          'o.status',
          'o.total',
          'o.commission',
          'o.worker_amount',
          'o.fulfillment',
          'o.delivery_address',
          'o.created_at',
          'o.customer_id',
          'o.worker_id',
          'w.display_name as worker_name',
          'wu.phone as worker_phone',
          'cu.name as customer_name',
          'cu.phone as customer_phone',
        ])
        .where('o.id', 'in', ids)
        .execute(),
      this.db.selectFrom('order_items').selectAll().where('order_id', 'in', ids).execute(),
      this.db
        .selectFrom('payments')
        .select(['order_id', 'status', 'created_at'])
        .where('order_id', 'in', ids)
        .orderBy('created_at')
        .execute(),
      this.db.selectFrom('reviews').selectAll().where('order_id', 'in', ids).execute(),
      this.db
        .selectFrom('complaints')
        .selectAll()
        .where('order_id', 'in', ids)
        .where('user_id', '=', viewer.userId)
        .orderBy('created_at', 'desc')
        .execute(),
    ]);
    const reviewByOrder = new Map<string, ReviewDto>(
      reviews.map((row) => [
        row.order_id,
        {
          id: row.id,
          orderId: row.order_id,
          rating: row.rating,
          comment: row.comment,
          status: row.status,
          createdAt: row.created_at.toISOString(),
        },
      ]),
    );
    const complaintByOrder = new Map<string, ComplaintDto>();
    for (const row of complaints) {
      if (complaintByOrder.has(row.order_id)) continue;
      complaintByOrder.set(row.order_id, {
        id: row.id,
        orderId: row.order_id,
        reason: row.reason,
        status: row.status,
        createdAt: row.created_at.toISOString(),
      });
    }
    const itemsByOrder = new Map<string, OrderItemDto[]>();
    for (const item of items) {
      const list = itemsByOrder.get(item.order_id) ?? [];
      list.push({
        id: item.id,
        productId: item.product_id,
        title: item.title_snapshot,
        unitPrice: item.unit_price,
        quantity: item.quantity,
        priceType: item.price_type,
      });
      itemsByOrder.set(item.order_id, list);
    }
    const paymentStatus = new Map<string, PaymentStatus>(
      payments.map((p) => [p.order_id, p.status]),
    );
    const byId = new Map(
      orders.map((row) => {
        const asWorker = viewer.workerId !== undefined && viewer.workerId === row.worker_id;
        const phoneVisible = PHONE_VISIBLE_STATUSES.includes(row.status as OrderStatus);
        const counterpart = asWorker
          ? { name: row.customer_name, phone: row.customer_phone }
          : { name: row.worker_name, phone: row.worker_phone };
        const dto: OrderDto = {
          id: row.id,
          type: row.type,
          status: row.status as OrderStatus,
          viewerRole: asWorker ? 'worker' : 'customer',
          total: row.total,
          commission: row.commission,
          workerAmount: row.worker_amount,
          fulfillment: row.fulfillment,
          deliveryAddress: row.delivery_address,
          items: itemsByOrder.get(row.id) ?? [],
          counterpart: { name: counterpart.name, phone: phoneVisible ? counterpart.phone : null },
          paymentStatus: paymentStatus.get(row.id) ?? null,
          review: reviewByOrder.get(row.id) ?? null,
          complaint: complaintByOrder.get(row.id) ?? null,
          createdAt: row.created_at.toISOString(),
        };
        return [row.id, dto] as const;
      }),
    );
    return ids.flatMap((id) => {
      const dto = byId.get(id);
      return dto ? [dto] : [];
    });
  }

  async findOwnerRefs(id: string): Promise<{ customerId: string; workerId: string } | undefined> {
    const row = await this.db
      .selectFrom('orders')
      .select(['customer_id', 'worker_id'])
      .where('id', '=', id)
      .executeTakeFirst();
    return row ? { customerId: row.customer_id, workerId: row.worker_id } : undefined;
  }

  async earningsFor(workerId: string, limit: number) {
    return this.db
      .selectFrom('earnings')
      .select(['order_id', 'amount', 'commission', 'created_at'])
      .where('worker_id', '=', workerId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .execute();
  }

  async earningsSince(workerId: string, since: Date): Promise<number> {
    const row = await this.db
      .selectFrom('earnings')
      .select((eb) => eb.fn.coalesce(eb.fn.sum<number>('amount'), eb.lit(0)).as('total'))
      .where('worker_id', '=', workerId)
      .where('created_at', '>=', since)
      .executeTakeFirstOrThrow();
    return Number(row.total);
  }

  async earningsTotal(workerId: string): Promise<number> {
    return this.earningsSince(workerId, new Date(0));
  }
}
