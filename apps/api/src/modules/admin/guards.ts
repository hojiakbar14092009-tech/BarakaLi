import type { Db } from '../../db/client.js';
import { AppError } from '../../errors.js';

/**
 * An administrator may not block, demote or remove themselves, and the last administrator can
 * never be taken away; the server checks this, whatever the client shows.
 */
export async function assertCanActOnAdmin(
  db: Db,
  actorId: string,
  targetUserId: string,
): Promise<void> {
  if (actorId === targetUserId) throw AppError.conflict('CANNOT_ACT_ON_SELF');
  const target = await db
    .selectFrom('users')
    .select('role')
    .where('id', '=', targetUserId)
    .executeTakeFirst();
  if (target?.role !== 'admin') return;
  const admins = await db
    .selectFrom('users')
    .select((eb) => eb.fn.countAll().as('n'))
    .where('role', '=', 'admin')
    .executeTakeFirstOrThrow();
  if (Number(admins.n) <= 1) throw AppError.conflict('LAST_ADMIN');
}
