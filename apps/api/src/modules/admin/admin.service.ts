import { sql } from 'kysely';
import {
  ADMIN_PAGE_SIZE,
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
import { nextRating } from '../feedback/feedback.service.js';

const RATING_DECIMALS = 100;
const FEATURED_CACHE_KEY = 'workers:featured';

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
    const [users, workers, verified, statuses, money, complaints, hidden] = await Promise.all([
      count(db.selectFrom('users').select((eb) => eb.fn.countAll().as('n'))),
      count(db.selectFrom('workers').select((eb) => eb.fn.countAll().as('n'))),
      count(
        db
          .selectFrom('workers')
          .select((eb) => eb.fn.countAll().as('n'))
          .where('is_verified', '=', true),
      ),
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
    ]);
    const commission = Number(money.commission);
    return {
      users,
      workers,
      verifiedWorkers: verified,
      pendingWorkers: workers - verified,
      ordersByStatus: Object.fromEntries(statuses.map((row) => [row.status, Number(row.n)])),
      turnover: Number(money.worker) + commission,
      commission,
      openComplaints: complaints,
      hiddenReviews: hidden,
    };
  }

  async listWorkers(query: AdminListQuery): Promise<Page<AdminWorkerDto>> {
    const offset = (query.page - 1) * ADMIN_PAGE_SIZE;
    const base = this.ctx.db
      .selectFrom('workers as w')
      .innerJoin('users as u', 'u.id', 'w.user_id')
      .innerJoin('categories as c', 'c.id', 'w.category_id');
    const filtered =
      query.status === 'pending'
        ? base.where('w.is_verified', '=', false)
        : query.status === 'verified'
          ? base.where('w.is_verified', '=', true)
          : base;
    const [rows, total] = await Promise.all([
      filtered
        .select([
          'w.id',
          'w.display_name',
          'u.phone',
          'c.slug as category_slug',
          'w.is_verified',
          'w.rating',
          'w.reviews_count',
          'w.created_at',
        ])
        .orderBy('w.is_verified')
        .orderBy('w.created_at', 'desc')
        .limit(ADMIN_PAGE_SIZE)
        .offset(offset)
        .execute(),
      filtered.select((eb) => eb.fn.countAll().as('n')).executeTakeFirstOrThrow(),
    ]);
    return paged(
      rows.map((row) => ({
        id: row.id,
        displayName: row.display_name,
        phone: row.phone,
        categorySlug: row.category_slug,
        isVerified: row.is_verified,
        rating: row.rating,
        reviewsCount: row.reviews_count,
        createdAt: row.created_at.toISOString(),
      })),
      Number(total.n),
      query.page,
    );
  }

  async setVerified(workerId: string, verified: boolean): Promise<void> {
    const result = await this.ctx.db
      .updateTable('workers')
      .set({ is_verified: verified })
      .where('id', '=', workerId)
      .executeTakeFirst();
    if (Number(result.numUpdatedRows) !== 1) throw AppError.notFound();
    this.ctx.cache.delete(FEATURED_CACHE_KEY);
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
          'o.commission',
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
        commission: row.commission,
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
  async setReviewStatus(reviewId: string, status: ReviewStatus): Promise<void> {
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

  async resolveComplaint(id: string, status: 'resolved' | 'dismissed'): Promise<void> {
    const result = await this.ctx.db
      .updateTable('complaints')
      .set({ status })
      .where('id', '=', id)
      .where('status', '=', 'open')
      .executeTakeFirst();
    if (Number(result.numUpdatedRows) === 1) return;
    const exists = await this.ctx.db
      .selectFrom('complaints')
      .select('id')
      .where('id', '=', id)
      .executeTakeFirst();
    throw exists ? AppError.conflict('COMPLAINT_NOT_OPEN') : AppError.notFound();
  }

  /** Manual refund after a complaint: money back through the provider, stock restored, order closed. */
  async refundOrder(orderId: string): Promise<void> {
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
    });
  }
}
