import { sql } from 'kysely';
import { TASHKENT_UTC_OFFSET_HOURS } from '@barakali/shared';
import {
  ADMIN_PAGE_SIZE,
  WORKER_STATUSES,
  canTransition,
  type AdminComplaintDto,
  type AdminListQuery,
  type AdminOrderDto,
  type AdminReviewDto,
  type AdminStatsDto,
  type AdminWorkerDto,
  type ComplaintStatus,
  type OrderStatus,
  type Page,
  type PaymentStatus,
  type ReviewStatus,
} from '@barakali/shared';
import type { AppContext } from '../../context.js';
import { AppError } from '../../errors.js';
import { refundPaidOrder } from '../payments/payment.service.js';
import { escapeLike } from '../products/product.repository.js';
import { nextRating } from '../feedback/feedback.service.js';
import { writeAudit } from './audit.js';

const RATING_DECIMALS = 100;
const FEATURED_CACHE_KEY = 'workers:featured';

type AdminWorkerRow = Awaited<
  ReturnType<ReturnType<AdminService['workerQuery']>['execute']>
>[number];
const HOUR_MS = 3_600_000;

/** Midnight of the current Tashkent day (fixed UTC+5, no DST) as a UTC instant. */
export function tashkentDayStart(now: Date): Date {
  const shifted = new Date(now.getTime() + TASHKENT_UTC_OFFSET_HOURS * HOUR_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - TASHKENT_UTC_OFFSET_HOURS * HOUR_MS);
}

/** Rating after one rating is taken out; the inverse of `nextRating`, 0 when none remain. */
export function ratingWithout(current: number, count: number, removed: number): number {
  if (count <= 1) return 0;
  const next = (current * count - removed) / (count - 1);
  return Math.round(Math.max(0, next) * RATING_DECIMALS) / RATING_DECIMALS;
}

function paged<T>(items: T[], total: number, page: number): Page<T> {
  return { items, page, pageSize: ADMIN_PAGE_SIZE, total };
}

export class AdminService {
  constructor(
    private readonly ctx: AppContext,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async stats(): Promise<AdminStatsDto> {
    const db = this.ctx.db;
    const count = async (query: { executeTakeFirstOrThrow(): Promise<{ n: unknown }> }) =>
      Number((await query.executeTakeFirstOrThrow()).n);
    const [users, workerCounts, statuses, money, complaints, hidden, today] = await Promise.all([
      count(db.selectFrom('users').select((eb) => eb.fn.countAll().as('n'))),
      db
        .selectFrom('workers')
        .select(['status', (eb) => eb.fn.countAll().as('n')])
        .groupBy('status')
        .execute(),
      db
        .selectFrom('orders')
        .select(['status', (eb) => eb.fn.countAll().as('n')])
        .groupBy('status')
        .execute(),
      db
        .selectFrom('earnings')
        .select([
          (eb) => eb.fn.coalesce(eb.fn.sum<number>('amount'), eb.lit(0)).as('worker'),
          (eb) => eb.fn.coalesce(eb.fn.sum<number>('commission'), eb.lit(0)).as('commission'),
        ])
        .executeTakeFirstOrThrow(),
      count(
        db
          .selectFrom('complaints')
          .select((eb) => eb.fn.countAll().as('n'))
          .where('status', '=', 'open'),
      ),
      count(
        db
          .selectFrom('reviews')
          .select((eb) => eb.fn.countAll().as('n'))
          .where('status', '=', 'hidden'),
      ),
      count(
        db
          .selectFrom('orders')
          .select((eb) => eb.fn.countAll().as('n'))
          .where('created_at', '>=', tashkentDayStart(this.now())),
      ),
    ]);
    const commission = Number(money.commission);
    const byStatus = (status: string) =>
      Number(workerCounts.find((row) => row.status === status)?.n ?? 0);
    return {
      users,
      workers: workerCounts.reduce((sum, row) => sum + Number(row.n), 0),
      approvedWorkers: byStatus('approved'),
      pendingWorkers: byStatus('pending'),
      rejectedWorkers: byStatus('rejected'),
      ordersByStatus: Object.fromEntries(statuses.map((row) => [row.status, Number(row.n)])),
      ordersToday: today,
      turnover: Number(money.worker) + commission,
      commission,
      openComplaints: complaints,
      hiddenReviews: hidden,
    };
  }

  private workerQuery() {
    return this.ctx.db
      .selectFrom('workers as w')
      .innerJoin('users as u', 'u.id', 'w.user_id')
      .innerJoin('categories as c', 'c.id', 'w.category_id')
      .leftJoin('users as rb', 'rb.id', 'w.reviewed_by')
      .select([
        'w.id',
        'w.user_id',
        'w.display_name',
        'u.phone',
        'w.telegram_username',
        'w.bio',
        'c.slug as category_slug',
        'w.status',
        'w.reject_reason',
        'w.reviewed_at',
        'rb.name as reviewed_by_name',
        'w.rating',
        'w.reviews_count',
        'w.created_at',
        sql<number>`(select count(*) from products p where p.worker_id = w.id)`.as(
          'products_count',
        ),
      ]);
  }

  private toAdminWorker(row: AdminWorkerRow): AdminWorkerDto {
    return {
      id: row.id,
      userId: row.user_id,
      displayName: row.display_name,
      phone: row.phone,
      telegramUsername: row.telegram_username,
      bio: row.bio,
      categorySlug: row.category_slug,
      status: row.status,
      rejectReason: row.reject_reason,
      reviewedAt: row.reviewed_at ? row.reviewed_at.toISOString() : null,
      reviewedByName: row.reviewed_by_name,
      productsCount: Number(row.products_count),
      rating: row.rating,
      reviewsCount: row.reviews_count,
      createdAt: row.created_at.toISOString(),
    } satisfies AdminWorkerDto;
  }

  /**
   * Search matches the display name or the end of the phone number (an administrator reads the
   * last four digits off a call); the full number is never needed, so it is never typed.
   */
  async listWorkers(query: AdminListQuery): Promise<Page<AdminWorkerDto>> {
    const offset = (query.page - 1) * ADMIN_PAGE_SIZE;
    const status = WORKER_STATUSES.find((value) => value === query.status);
    let filtered = status ? this.workerQuery().where('w.status', '=', status) : this.workerQuery();
    const q = query.q?.trim();
    if (q) {
      const digits = q.replace(/\D/g, '');
      filtered = filtered.where((eb) =>
        eb.or([
          eb('w.display_name', 'ilike', `%${escapeLike(q)}%`),
          ...(digits ? [eb('u.phone', 'like', `%${digits}`)] : []),
        ]),
      );
    }
    const ordered =
      status === 'pending'
        ? filtered.orderBy('w.created_at', 'asc')
        : filtered.orderBy(sql`(w.status = 'pending')`, 'desc').orderBy('w.created_at', 'desc');
    const [rows, total] = await Promise.all([
      ordered.limit(ADMIN_PAGE_SIZE).offset(offset).execute(),
      filtered
        .clearSelect()
        .select((eb) => eb.fn.countAll().as('n'))
        .executeTakeFirstOrThrow(),
    ]);
    return paged(
      rows.map((row) => this.toAdminWorker(row)),
      Number(total.n),
      query.page,
    );
  }

  async getWorker(workerId: string): Promise<AdminWorkerDto> {
    const row = await this.workerQuery().where('w.id', '=', workerId).executeTakeFirst();
    if (!row) throw AppError.notFound();
    return this.toAdminWorker(row);
  }

  /**
   * Records the decision (who and when), the new status and the applicant's notification in one
   * transaction, so a decision can never exist without its audit trail or its message.
   */
  private async decide(
    adminId: string,
    workerId: string,
    decision: { status: 'approved' | 'rejected' | 'suspended'; reason: string | null },
  ): Promise<void> {
    const kinds = {
      approved: 'worker_approved',
      rejected: 'worker_rejected',
      suspended: 'worker_suspended',
    } as const;
    const actions = {
      approved: 'worker.approve',
      rejected: 'worker.reject',
      suspended: 'worker.suspend',
    } as const;
    await this.ctx.db.transaction().execute(async (trx) => {
      const worker = await trx
        .updateTable('workers')
        .set({
          status: decision.status,
          reviewed_by: adminId,
          reviewed_at: this.now(),
          reject_reason: decision.reason,
        })
        .where('id', '=', workerId)
        .returning('user_id')
        .executeTakeFirst();
      if (!worker) throw AppError.notFound();
      await trx
        .insertInto('notifications')
        .values({
          user_id: worker.user_id,
          kind: kinds[decision.status],
          detail: decision.reason,
        })
        .execute();
      await writeAudit(trx, {
        adminId,
        action: actions[decision.status],
        targetType: 'worker',
        targetId: workerId,
        details: { status: decision.status, reason: decision.reason },
      });
    });
    this.ctx.cache.delete(FEATURED_CACHE_KEY);
  }

  /** Also reinstates a rejected or suspended worker. */
  approveWorker(adminId: string, workerId: string): Promise<void> {
    return this.decide(adminId, workerId, { status: 'approved', reason: null });
  }

  rejectWorker(adminId: string, workerId: string, reason: string): Promise<void> {
    return this.decide(adminId, workerId, { status: 'rejected', reason });
  }

  /** Only an approved worker can be suspended; orders already placed keep running. */
  async suspendWorker(adminId: string, workerId: string, reason: string): Promise<void> {
    const current = await this.ctx.db
      .selectFrom('workers')
      .select('status')
      .where('id', '=', workerId)
      .executeTakeFirst();
    if (!current) throw AppError.notFound();
    if (current.status !== 'approved') throw AppError.conflict('WORKER_NOT_APPROVED');
    await this.decide(adminId, workerId, { status: 'suspended', reason });
  }

  async listOrders(query: AdminListQuery): Promise<Page<AdminOrderDto>> {
    const offset = (query.page - 1) * ADMIN_PAGE_SIZE;
    const base = this.ctx.db
      .selectFrom('orders as o')
      .innerJoin('workers as w', 'w.id', 'o.worker_id')
      .innerJoin('users as cu', 'cu.id', 'o.customer_id');
    const filtered = query.status ? base.where('o.status', '=', query.status) : base;
    const [rows, total] = await Promise.all([
      filtered
        .select([
          'o.id',
          'o.type',
          'o.status',
          'o.total',
          'o.commission_amount',
          'o.created_at',
          'cu.name as customer_name',
          'w.display_name as worker_name',
          sql<PaymentStatus | null>`(select p.status from payments p where p.order_id = o.id order by p.created_at desc limit 1)`.as(
            'payment_status',
          ),
        ])
        .orderBy('o.created_at', 'desc')
        .limit(ADMIN_PAGE_SIZE)
        .offset(offset)
        .execute(),
      filtered.select((eb) => eb.fn.countAll().as('n')).executeTakeFirstOrThrow(),
    ]);
    return paged(
      rows.map((row) => ({
        id: row.id,
        type: row.type,
        status: row.status as OrderStatus,
        total: row.total,
        commission: row.commission_amount,
        customerName: row.customer_name,
        workerName: row.worker_name,
        paymentStatus: row.payment_status,
        createdAt: row.created_at.toISOString(),
      })),
      Number(total.n),
      query.page,
    );
  }

  async listReviews(query: AdminListQuery): Promise<Page<AdminReviewDto>> {
    const offset = (query.page - 1) * ADMIN_PAGE_SIZE;
    const base = this.ctx.db
      .selectFrom('reviews as r')
      .innerJoin('workers as w', 'w.id', 'r.worker_id')
      .innerJoin('users as u', 'u.id', 'r.customer_id');
    const filtered =
      query.status === 'visible' || query.status === 'hidden'
        ? base.where('r.status', '=', query.status)
        : base;
    const [rows, total] = await Promise.all([
      filtered
        .select([
          'r.id',
          'r.order_id',
          'r.rating',
          'r.comment',
          'r.status',
          'r.created_at',
          'w.display_name as worker_name',
          'u.name as author_name',
        ])
        .orderBy('r.created_at', 'desc')
        .limit(ADMIN_PAGE_SIZE)
        .offset(offset)
        .execute(),
      filtered.select((eb) => eb.fn.countAll().as('n')).executeTakeFirstOrThrow(),
    ]);
    return paged(
      rows.map((row) => ({
        id: row.id,
        orderId: row.order_id,
        workerName: row.worker_name,
        authorName: row.author_name,
        rating: row.rating,
        comment: row.comment,
        status: row.status,
        createdAt: row.created_at.toISOString(),
      })),
      Number(total.n),
      query.page,
    );
  }

  /**
   * Hides or restores a review and moves the worker's rating in the same transaction. A review that
   * is already in the requested state changes nothing, so a repeated click cannot drift the rating.
   */
  async setReviewStatus(adminId: string, reviewId: string, status: ReviewStatus): Promise<void> {
    await this.ctx.db.transaction().execute(async (trx) => {
      const review = await trx
        .selectFrom('reviews')
        .select(['id', 'worker_id', 'rating', 'status'])
        .where('id', '=', reviewId)
        .forUpdate()
        .executeTakeFirst();
      if (!review) throw AppError.notFound();
      if (review.status === status) return;
      const worker = await trx
        .selectFrom('workers')
        .select(['rating', 'reviews_count'])
        .where('id', '=', review.worker_id)
        .forUpdate()
        .executeTakeFirstOrThrow();
      const hiding = status === 'hidden';
      await trx
        .updateTable('workers')
        .set({
          rating: hiding
            ? ratingWithout(worker.rating, worker.reviews_count, review.rating)
            : nextRating(worker.rating, worker.reviews_count, review.rating),
          reviews_count: Math.max(0, worker.reviews_count + (hiding ? -1 : 1)),
        })
        .where('id', '=', review.worker_id)
        .execute();
      await trx.updateTable('reviews').set({ status }).where('id', '=', reviewId).execute();
      await writeAudit(trx, {
        adminId,
        action: hiding ? 'review.hide' : 'review.show',
        targetType: 'review',
        targetId: reviewId,
        details: { status },
      });
    });
    this.ctx.cache.delete(FEATURED_CACHE_KEY);
  }

  async listComplaints(query: AdminListQuery): Promise<Page<AdminComplaintDto>> {
    const offset = (query.page - 1) * ADMIN_PAGE_SIZE;
    const base = this.ctx.db
      .selectFrom('complaints as c')
      .innerJoin('orders as o', 'o.id', 'c.order_id')
      .innerJoin('users as u', 'u.id', 'c.user_id');
    const filtered = query.status
      ? base.where('c.status', '=', query.status as ComplaintStatus)
      : base;
    const [rows, total] = await Promise.all([
      filtered
        .select([
          'c.id',
          'c.order_id',
          'c.reason',
          'c.status',
          'c.created_at',
          'c.user_id',
          'o.customer_id',
          'o.status as order_status',
          'u.name as author_name',
          sql<PaymentStatus | null>`(select p.status from payments p where p.order_id = o.id order by p.created_at desc limit 1)`.as(
            'payment_status',
          ),
        ])
        .orderBy('c.created_at', 'desc')
        .limit(ADMIN_PAGE_SIZE)
        .offset(offset)
        .execute(),
      filtered.select((eb) => eb.fn.countAll().as('n')).executeTakeFirstOrThrow(),
    ]);
    return paged(
      rows.map((row) => ({
        id: row.id,
        orderId: row.order_id,
        authorName: row.author_name,
        authorRole: row.user_id === row.customer_id ? ('customer' as const) : ('worker' as const),
        reason: row.reason,
        status: row.status,
        orderStatus: row.order_status as OrderStatus,
        paymentStatus: row.payment_status,
        createdAt: row.created_at.toISOString(),
      })),
      Number(total.n),
      query.page,
    );
  }

  async resolveComplaint(
    adminId: string,
    id: string,
    status: 'resolved' | 'dismissed',
  ): Promise<void> {
    const updated = await this.ctx.db.transaction().execute(async (trx) => {
      const result = await trx
        .updateTable('complaints')
        .set({ status })
        .where('id', '=', id)
        .where('status', '=', 'open')
        .executeTakeFirst();
      if (Number(result.numUpdatedRows) !== 1) return false;
      await writeAudit(trx, {
        adminId,
        action: status === 'resolved' ? 'complaint.resolve' : 'complaint.dismiss',
        targetType: 'complaint',
        targetId: id,
        details: { status },
      });
      return true;
    });
    if (updated) return;
    const exists = await this.ctx.db
      .selectFrom('complaints')
      .select('id')
      .where('id', '=', id)
      .executeTakeFirst();
    throw exists ? AppError.conflict('COMPLAINT_NOT_OPEN') : AppError.notFound();
  }

  /** Manual refund after a complaint: money back through the provider, stock restored, order closed. */
  async refundOrder(adminId: string, orderId: string): Promise<void> {
    await this.ctx.db.transaction().execute(async (trx) => {
      const order = await trx
        .selectFrom('orders')
        .select(['id', 'status'])
        .where('id', '=', orderId)
        .forUpdate()
        .executeTakeFirst();
      if (!order) throw AppError.notFound();
      if (!canTransition(order.status as OrderStatus, 'refunded')) {
        throw AppError.conflict('ORDER_NOT_REFUNDABLE');
      }
      const paid = await trx
        .selectFrom('payments')
        .select('id')
        .where('order_id', '=', orderId)
        .where('status', '=', 'paid')
        .executeTakeFirst();
      if (!paid) throw AppError.conflict('ORDER_NOT_REFUNDABLE');
      await refundPaidOrder(trx, this.ctx.payments, orderId);
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
        details: { from: order.status, to: 'refunded' },
      });
    });
  }
}
