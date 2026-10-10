import type { Db } from './client.js';

export interface MismatchedOrder {
  orderId: string;
  status: string;
  createdAt: Date;
  orderWorkerId: string;
  productWorkerIds: string[];
}

/**
 * Read-only check: orders whose product lines belong to a different worker than the order itself.
 * Rows written before the `order_items_owner_matches` trigger existed can only be found this way;
 * nothing here changes data, and nothing personal (names, phones) is returned.
 */
export async function findMismatchedOrders(db: Db): Promise<MismatchedOrder[]> {
  const rows = await db
    .selectFrom('orders as o')
    .innerJoin('order_items as i', 'i.order_id', 'o.id')
    .innerJoin('products as p', 'p.id', 'i.product_id')
    .select(['o.id', 'o.status', 'o.created_at', 'o.worker_id', 'p.worker_id as product_worker_id'])
    .whereRef('p.worker_id', '!=', 'o.worker_id')
    .orderBy('o.created_at')
    .execute();
  const byOrder = new Map<string, MismatchedOrder>();
  for (const row of rows) {
    const entry = byOrder.get(row.id) ?? {
      orderId: row.id,
      status: row.status,
      createdAt: row.created_at,
      orderWorkerId: row.worker_id,
      productWorkerIds: [],
    };
    if (!entry.productWorkerIds.includes(row.product_worker_id)) {
      entry.productWorkerIds.push(row.product_worker_id);
    }
    byOrder.set(row.id, entry);
  }
  return [...byOrder.values()];
}
