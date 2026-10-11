import type { Transaction } from 'kysely';
import type { Database } from '../../db/schema.js';

/**
 * Tells every administrator that a worker paid for materials. Written inside the payment
 * transaction, so a paid order always has its notice and a rolled-back payment leaves none.
 */
export async function notifyAdminsOfMaterialOrder(
  trx: Transaction<Database>,
  materialOrderId: string,
): Promise<void> {
  const admins = await trx
    .selectFrom('users')
    .select('id')
    .where('role', '=', 'admin')
    .where('blocked_at', 'is', null)
    .execute();
  if (admins.length === 0) return;
  await trx
    .insertInto('notifications')
    .values(
      admins.map((admin) => ({
        user_id: admin.id,
        kind: 'material_order_paid' as const,
        material_order_id: materialOrderId,
      })),
    )
    .execute();
}

/**
 * Tells the worker the order is on its way; `detail` carries the courier's name for the message.
 * Returns the worker's phone for the SMS copy, which is sent after commit.
 */
export async function notifyWorkerOfShipment(
  trx: Transaction<Database>,
  materialOrderId: string,
  courierName: string,
): Promise<string> {
  const worker = await trx
    .selectFrom('material_orders as m')
    .innerJoin('workers as w', 'w.id', 'm.worker_id')
    .innerJoin('users as u', 'u.id', 'w.user_id')
    .select(['u.id as user_id', 'u.phone'])
    .where('m.id', '=', materialOrderId)
    .executeTakeFirstOrThrow();
  await trx
    .insertInto('notifications')
    .values({
      user_id: worker.user_id,
      kind: 'material_order_shipped',
      material_order_id: materialOrderId,
      detail: courierName,
    })
    .execute();
  return worker.phone;
}
