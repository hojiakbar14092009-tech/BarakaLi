import type { ComplaintDto, ComplaintInput, ReviewDto, ReviewInput } from '@barakali/shared';
import type { AppContext } from '../../context.js';
import type { Db } from '../../db/client.js';
import type { Cache } from '../../infra/cache.js';
import { AppError } from '../../errors.js';

const UNIQUE_VIOLATION = '23505';
const RATING_DECIMALS = 100;

interface OrderParties {
  id: string;
  customerId: string;
  workerId: string;
  workerUserId: string;
  status: string;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === UNIQUE_VIOLATION
  );
}

/** New average after one more rating, kept to two decimals like the workers.rating column. */
export function nextRating(current: number, count: number, added: number): number {
  return Math.round(((current * count + added) / (count + 1)) * RATING_DECIMALS) / RATING_DECIMALS;
}

export class FeedbackService {
  private readonly db: Db;
  private readonly cache: Cache;

  constructor(ctx: AppContext) {
    this.db = ctx.db;
    this.cache = ctx.cache;
  }

  /**
   * Saves the review and moves the worker's rating in one transaction. The order row is locked
   * first, so two simultaneous submissions cannot both pass the "no review yet" check.
   */
  async createReview(userId: string, orderId: string, input: ReviewInput): Promise<ReviewDto> {
    try {
      const review = await this.db.transaction().execute(async (trx) => {
        const order = await this.lockOrder(trx, orderId);
        if (!order) throw AppError.notFound();
        if (order.customerId !== userId) {
          throw order.workerUserId === userId ? AppError.forbidden() : AppError.notFound();
        }
        if (order.status !== 'delivered') throw AppError.conflict('ORDER_NOT_REVIEWABLE');

        const existing = await trx
          .selectFrom('reviews')
          .select('id')
          .where('order_id', '=', orderId)
          .executeTakeFirst();
        if (existing) throw AppError.conflict('REVIEW_ALREADY_EXISTS');

        const worker = await trx
          .selectFrom('workers')
          .select(['rating', 'reviews_count'])
          .where('id', '=', order.workerId)
          .forUpdate()
          .executeTakeFirstOrThrow();
        const row = await trx
          .insertInto('reviews')
          .values({
            order_id: orderId,
            customer_id: userId,
            worker_id: order.workerId,
            rating: input.rating,
            comment: input.comment ? input.comment : null,
          })
          .returningAll()
          .executeTakeFirstOrThrow();
        await trx
          .updateTable('workers')
          .set({
            rating: nextRating(worker.rating, worker.reviews_count, input.rating),
            reviews_count: worker.reviews_count + 1,
          })
          .where('id', '=', order.workerId)
          .execute();
        return {
          id: row.id,
          orderId: row.order_id,
          rating: row.rating,
          comment: row.comment,
          status: row.status,
          createdAt: row.created_at.toISOString(),
        };
      });
      // After commit: featured workers are ordered by rating, so the cached list is stale now.
      this.cache.delete('workers:featured');
      return review;
    } catch (error) {
      if (isUniqueViolation(error)) throw AppError.conflict('REVIEW_ALREADY_EXISTS');
      throw error;
    }
  }

  /** Either side of an order may complain; strangers get a 404 so order ids are not probeable. */
  async createComplaint(
    userId: string,
    orderId: string,
    input: ComplaintInput,
  ): Promise<ComplaintDto> {
    const order = await this.findOrder(orderId);
    if (!order || (order.customerId !== userId && order.workerUserId !== userId)) {
      throw AppError.notFound();
    }
    try {
      const row = await this.db
        .insertInto('complaints')
        .values({ order_id: orderId, user_id: userId, reason: input.reason })
        .returningAll()
        .executeTakeFirstOrThrow();
      return {
        id: row.id,
        orderId: row.order_id,
        reason: row.reason,
        status: row.status,
        createdAt: row.created_at.toISOString(),
      };
    } catch (error) {
      if (isUniqueViolation(error)) throw AppError.conflict('COMPLAINT_ALREADY_OPEN');
      throw error;
    }
  }

  private findOrder(orderId: string): Promise<OrderParties | undefined> {
    return this.selectOrder(this.db, orderId, false);
  }

  private lockOrder(trx: Db, orderId: string): Promise<OrderParties | undefined> {
    return this.selectOrder(trx, orderId, true);
  }

  private async selectOrder(
    db: Db,
    orderId: string,
    lock: boolean,
  ): Promise<OrderParties | undefined> {
    let query = db
      .selectFrom('orders as o')
      .innerJoin('workers as w', 'w.id', 'o.worker_id')
      .select(['o.id', 'o.customer_id', 'o.worker_id', 'o.status', 'w.user_id as worker_user_id'])
      .where('o.id', '=', orderId);
    if (lock) query = query.forUpdate('o');
    const row = await query.executeTakeFirst();
    if (!row) return undefined;
    return {
      id: row.id,
      customerId: row.customer_id,
      workerId: row.worker_id,
      workerUserId: row.worker_user_id,
      status: row.status,
    };
  }
}
