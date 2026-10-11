import type { Transaction } from 'kysely';
import type { NotificationsDto } from '@barakali/shared';
import type { AppContext } from '../../context.js';
import type { Database } from '../../db/schema.js';
import { logger } from '../../logger.js';

const LIST_LIMIT = 30;
const MATERIAL_KINDS = ['material_order_paid', 'material_order_shipped'] as const;

/**
 * Writes the worker's in-app notification inside the caller's transaction, so an order can never
 * reach `new` without its notification (and a rolled-back order leaves none behind).
 */
export async function notifyWorkerOfNewOrder(
  trx: Transaction<Database>,
  orderId: string,
): Promise<string> {
  const worker = await trx
    .selectFrom('orders as o')
    .innerJoin('workers as w', 'w.id', 'o.worker_id')
    .innerJoin('users as u', 'u.id', 'w.user_id')
    .select(['u.id as user_id', 'u.phone'])
    .where('o.id', '=', orderId)
    .executeTakeFirstOrThrow();
  await trx
    .insertInto('notifications')
    .values({ user_id: worker.user_id, kind: 'order_new', order_id: orderId })
    .execute();
  return worker.phone;
}

/** SMS copy of the notification; sent after commit and never allowed to fail the request. */
export async function sendNewOrderSms(ctx: AppContext, phone: string, message: string) {
  try {
    await ctx.sms.send(phone, message);
  } catch (error) {
    logger.warn('Order SMS was not sent', {
      message: error instanceof Error ? error.message : 'unknown',
    });
  }
}

export class NotificationService {
  constructor(private readonly ctx: AppContext) {}

  async list(userId: string): Promise<NotificationsDto> {
    const [items, unread] = await Promise.all([
      this.ctx.db
        .selectFrom('notifications')
        .selectAll()
        .where('user_id', '=', userId)
        .orderBy('created_at', 'desc')
        .limit(LIST_LIMIT)
        .execute(),
      this.unreadCounts(userId),
    ]);
    return {
      ...unread,
      items: items.map((row) => ({
        id: row.id,
        kind: row.kind,
        detail: row.detail,
        orderId: row.order_id,
        materialOrderId: row.material_order_id,
        readAt: row.read_at ? row.read_at.toISOString() : null,
        createdAt: row.created_at.toISOString(),
      })),
    };
  }

  /** One query, two counters: new orders badge the orders entry, materials badge the store. */
  private async unreadCounts(userId: string) {
    const row = await this.ctx.db
      .selectFrom('notifications')
      .select((eb) => [
        eb.fn.countAll().filterWhere('kind', '=', 'order_new').as('orders'),
        eb.fn.countAll().filterWhere('kind', 'in', MATERIAL_KINDS).as('materials'),
      ])
      .where('user_id', '=', userId)
      .where('read_at', 'is', null)
      .executeTakeFirstOrThrow();
    return { unread: Number(row.orders), unreadMaterials: Number(row.materials) };
  }

  /** Opening the materials page (store or admin list) counts as having seen its notices. */
  async markMaterialsRead(userId: string): Promise<void> {
    await this.ctx.db
      .updateTable('notifications')
      .set({ read_at: new Date() })
      .where('user_id', '=', userId)
      .where('kind', 'in', MATERIAL_KINDS)
      .where('read_at', 'is', null)
      .execute();
  }

  /** Marks everything about one order as read; opening the order is the natural "seen". */
  async markOrderRead(userId: string, orderId: string): Promise<void> {
    await this.ctx.db
      .updateTable('notifications')
      .set({ read_at: new Date() })
      .where('user_id', '=', userId)
      .where('order_id', '=', orderId)
      .where('read_at', 'is', null)
      .execute();
  }

  async markAllRead(userId: string): Promise<void> {
    await this.ctx.db
      .updateTable('notifications')
      .set({ read_at: new Date() })
      .where('user_id', '=', userId)
      .where('read_at', 'is', null)
      .execute();
  }
}
