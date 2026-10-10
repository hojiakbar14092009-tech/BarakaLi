import { UNPAID_ORDER_TTL_MINUTES, WORKER_ACCEPT_TTL_HOURS } from '@barakali/shared';
import type { AppContext } from '../../context.js';
import type { Db } from '../../db/client.js';
import { logger } from '../../logger.js';
import { refundPaidOrder } from '../payments/payment.service.js';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const REFUND_BATCH = 50;

/**
 * Cancels orders that were not paid within the window, which frees their calendar slot
 * (the exclusion constraint only covers active statuses). One transaction for both tables.
 */
export async function expireUnpaidOrders(db: Db, now: Date): Promise<number> {
  const cutoff = new Date(now.getTime() - UNPAID_ORDER_TTL_MINUTES * MINUTE_MS);
  return db.transaction().execute(async (trx) => {
    const expired = await trx
      .updateTable('orders')
      .set({ status: 'cancelled', updated_at: now })
      .where('status', '=', 'awaiting_payment')
      .where('created_at', '<', cutoff)
      .returning('id')
      .execute();
    if (expired.length === 0) return 0;
    await trx
      .updateTable('payments')
      .set({ status: 'failed' })
      .where('status', '=', 'pending')
      .where(
        'order_id',
        'in',
        expired.map((row) => row.id),
      )
      .execute();
    return expired.length;
  });
}

/**
 * Paid orders the worker neither accepted nor rejected within 24 hours are refunded. `updated_at`
 * of a `new` order is the moment it was paid, because `new` is only entered through payment.
 */
export async function refundUnacceptedOrders(ctx: AppContext, now: Date): Promise<number> {
  const cutoff = new Date(now.getTime() - WORKER_ACCEPT_TTL_HOURS * HOUR_MS);
  const stale = await ctx.db
    .selectFrom('orders')
    .select('id')
    .where('status', '=', 'new')
    .where('updated_at', '<', cutoff)
    .orderBy('updated_at')
    .limit(REFUND_BATCH)
    .execute();
  let refunded = 0;
  for (const { id } of stale) {
    try {
      refunded += await refundOne(ctx, id, cutoff, now);
    } catch (error) {
      // One failing provider call must not block the remaining orders; it is retried next run.
      logger.error('Automatic refund failed', {
        orderId: id,
        message: error instanceof Error ? error.message : 'unknown',
      });
    }
  }
  return refunded;
}

async function refundOne(ctx: AppContext, id: string, cutoff: Date, now: Date): Promise<number> {
  return ctx.db.transaction().execute(async (trx) => {
    const order = await trx
      .selectFrom('orders')
      .select(['status', 'updated_at'])
      .where('id', '=', id)
      .forUpdate()
      .executeTakeFirst();
    // The worker may have answered between the scan and the lock.
    if (!order || order.status !== 'new' || order.updated_at >= cutoff) return 0;
    await refundPaidOrder(trx, ctx.payments, id);
    await trx
      .updateTable('orders')
      .set({ status: 'refunded', updated_at: now })
      .where('id', '=', id)
      .execute();
    return 1;
  });
}

/** Unpaid material orders follow the same 15 minute rule; nothing is reserved before payment. */
export async function expireUnpaidMaterialOrders(db: Db, now: Date): Promise<number> {
  const cutoff = new Date(now.getTime() - UNPAID_ORDER_TTL_MINUTES * MINUTE_MS);
  return db.transaction().execute(async (trx) => {
    const expired = await trx
      .updateTable('material_orders')
      .set({ status: 'cancelled', updated_at: now })
      .where('status', '=', 'awaiting_payment')
      .where('created_at', '<', cutoff)
      .returning('id')
      .execute();
    if (expired.length === 0) return 0;
    await trx
      .updateTable('material_payments')
      .set({ status: 'failed' })
      .where('status', '=', 'pending')
      .where(
        'material_order_id',
        'in',
        expired.map((row) => row.id),
      )
      .execute();
    return expired.length;
  });
}
