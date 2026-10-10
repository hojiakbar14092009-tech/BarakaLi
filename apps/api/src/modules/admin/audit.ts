import type { Kysely, Transaction } from 'kysely';
import { ADMIN_PAGE_SIZE, type AdminAuditEntryDto, type Page } from '@barakali/shared';
import type { Database } from '../../db/schema.js';

export type AuditAction =
  | 'worker.approve'
  | 'worker.reject'
  | 'worker.suspend'
  | 'review.hide'
  | 'review.show'
  | 'complaint.resolve'
  | 'complaint.dismiss'
  | 'order.refund'
  | 'material.create'
  | 'material.update'
  | 'material_order.deliver';

export type AuditTarget =
  'worker' | 'review' | 'complaint' | 'order' | 'material' | 'material_order';

/** Plain values only; the writer never receives phone numbers, codes or tokens. */
export type AuditDetails = Record<string, string | number | boolean | null>;

export interface AuditEntry {
  adminId: string;
  action: AuditAction;
  targetType: AuditTarget;
  targetId: string | null;
  details?: AuditDetails;
}

type Writer = Kysely<Database> | Transaction<Database>;

/** Appends one entry; call it inside the action's own transaction so both land or neither does. */
export async function writeAudit(db: Writer, entry: AuditEntry): Promise<void> {
  await db
    .insertInto('audit_log')
    .values({
      admin_user_id: entry.adminId,
      action: entry.action,
      target_type: entry.targetType,
      target_id: entry.targetId,
      details: JSON.stringify(entry.details ?? {}),
    })
    .execute();
}

export async function listAudit(db: Writer, page: number): Promise<Page<AdminAuditEntryDto>> {
  const offset = (page - 1) * ADMIN_PAGE_SIZE;
  const [rows, total] = await Promise.all([
    db
      .selectFrom('audit_log as a')
      .innerJoin('users as u', 'u.id', 'a.admin_user_id')
      .select([
        'a.id',
        'a.action',
        'a.target_type',
        'a.target_id',
        'a.details',
        'a.created_at',
        'u.name as admin_name',
      ])
      .orderBy('a.created_at', 'desc')
      .limit(ADMIN_PAGE_SIZE)
      .offset(offset)
      .execute(),
    db
      .selectFrom('audit_log')
      .select((eb) => eb.fn.countAll().as('n'))
      .executeTakeFirstOrThrow(),
  ]);
  return {
    items: rows.map((row) => ({
      id: row.id,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      details: (typeof row.details === 'string' ? JSON.parse(row.details) : row.details) as Record<
        string,
        unknown
      >,
      adminName: row.admin_name,
      createdAt: row.created_at.toISOString(),
    })),
    page,
    pageSize: ADMIN_PAGE_SIZE,
    total: Number(total.n),
  };
}
