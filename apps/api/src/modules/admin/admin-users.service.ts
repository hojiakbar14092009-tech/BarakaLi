import { sql } from 'kysely';
import {
  ADMIN_PAGE_SIZE,
  type AdminListQuery,
  type AdminUserDto,
  type Page,
} from '@barakali/shared';
import type { AppContext } from '../../context.js';
import { AppError } from '../../errors.js';
import { escapeLike } from '../products/product.repository.js';
import { writeAudit } from './audit.js';
import { assertCanActOnAdmin } from './guards.js';

export class AdminUsersService {
  constructor(
    private readonly ctx: AppContext,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private query() {
    return this.ctx.db
      .selectFrom('users as u')
      .leftJoin('workers as w', 'w.user_id', 'u.id')
      .select([
        'u.id',
        'u.name',
        'u.phone',
        'u.role',
        'u.language',
        'u.blocked_at',
        'u.block_reason',
        'u.created_at',
        'w.id as worker_id',
        'w.status as worker_status',
        sql<number>`(select count(*) from orders o where o.customer_id = u.id)`.as('orders_count'),
      ]);
  }

  private toDto(
    row: Awaited<ReturnType<ReturnType<AdminUsersService['query']>['execute']>>[number],
  ) {
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      role: row.role,
      language: row.language,
      workerId: row.worker_id,
      workerStatus: row.worker_status,
      ordersCount: Number(row.orders_count),
      blockedAt: row.blocked_at ? row.blocked_at.toISOString() : null,
      blockReason: row.block_reason,
      createdAt: row.created_at.toISOString(),
    } satisfies AdminUserDto;
  }

  async list(query: AdminListQuery): Promise<Page<AdminUserDto>> {
    const offset = (query.page - 1) * ADMIN_PAGE_SIZE;
    let filtered = this.query();
    if (query.status === 'blocked') filtered = filtered.where('u.blocked_at', 'is not', null);
    else if (query.status === 'admin' || query.status === 'worker' || query.status === 'customer') {
      filtered = filtered.where('u.role', '=', query.status);
    }
    const q = query.q?.trim();
    if (q) {
      const digits = q.replace(/\D/g, '');
      filtered = filtered.where((eb) =>
        eb.or([
          eb('u.name', 'ilike', `%${escapeLike(q)}%`),
          ...(digits ? [eb('u.phone', 'like', `%${digits}`)] : []),
        ]),
      );
    }
    const [rows, total] = await Promise.all([
      filtered.orderBy('u.created_at', 'desc').limit(ADMIN_PAGE_SIZE).offset(offset).execute(),
      filtered
        .clearSelect()
        .select((eb) => eb.fn.countAll().as('n'))
        .executeTakeFirstOrThrow(),
    ]);
    return {
      items: rows.map((row) => this.toDto(row)),
      page: query.page,
      pageSize: ADMIN_PAGE_SIZE,
      total: Number(total.n),
    };
  }

  async get(userId: string): Promise<AdminUserDto> {
    const row = await this.query().where('u.id', '=', userId).executeTakeFirst();
    if (!row) throw AppError.notFound();
    return this.toDto(row);
  }

  /** Blocking also revokes every refresh token, so open sessions end at their next refresh. */
  async setBlocked(
    adminId: string,
    userId: string,
    reason: string | null,
    blocked: boolean,
  ): Promise<void> {
    await assertCanActOnAdmin(this.ctx.db, adminId, userId);
    await this.ctx.db.transaction().execute(async (trx) => {
      const result = await trx
        .updateTable('users')
        .set({ blocked_at: blocked ? this.now() : null, block_reason: blocked ? reason : null })
        .where('id', '=', userId)
        .executeTakeFirst();
      if (Number(result.numUpdatedRows) !== 1) throw AppError.notFound();
      if (blocked) {
        await trx
          .updateTable('refresh_tokens')
          .set({ revoked_at: this.now() })
          .where('user_id', '=', userId)
          .where('revoked_at', 'is', null)
          .execute();
      }
      await writeAudit(trx, {
        adminId,
        action: blocked ? 'user.block' : 'user.unblock',
        targetType: 'user',
        targetId: userId,
        details: { reason },
      });
    });
  }
}
