import { sql } from 'kysely';
import type { BecomeWorkerInput, WorkerStatus, WorkerSummaryDto } from '@barakali/shared';
import type { Db } from '../../db/client.js';

interface WorkerRow {
  id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  rating: number;
  reviews_count: number;
  status: WorkerStatus;
  category_slug: string;
  min_price: number | null;
  products_count: number;
}

function toDto(row: WorkerRow): WorkerSummaryDto {
  return {
    id: row.id,
    displayName: row.display_name,
    bio: row.bio,
    categorySlug: row.category_slug,
    avatarUrl: row.avatar_url,
    rating: row.rating,
    reviewsCount: row.reviews_count,
    // The badge is derived from the reviewed status, never stored as a separate flag.
    isVerified: row.status === 'approved',
    minPrice: row.min_price === null ? null : Number(row.min_price),
    productsCount: Number(row.products_count),
  };
}

export class WorkersRepository {
  constructor(private readonly db: Db) {}

  async setTelegramUsername(userId: string, telegramUsername: string | null): Promise<boolean> {
    const result = await this.db
      .updateTable('workers')
      .set({ telegram_username: telegramUsername })
      .where('user_id', '=', userId)
      .executeTakeFirst();
    return Number(result.numUpdatedRows) === 1;
  }

  async findIdByUser(userId: string): Promise<string | undefined> {
    const row = await this.db
      .selectFrom('workers')
      .select('id')
      .where('user_id', '=', userId)
      .executeTakeFirst();
    return row?.id;
  }

  async categoryExists(categoryId: string): Promise<boolean> {
    const row = await this.db
      .selectFrom('categories')
      .select('id')
      .where('id', '=', categoryId)
      .where('is_active', '=', true)
      .executeTakeFirst();
    return row !== undefined;
  }

  async create(userId: string, input: BecomeWorkerInput): Promise<string> {
    return this.db.transaction().execute(async (trx) => {
      const worker = await trx
        .insertInto('workers')
        .values({
          user_id: userId,
          category_id: input.categoryId,
          display_name: input.displayName,
          bio: input.bio ?? null,
          avatar_url: null,
        })
        .returning('id')
        .executeTakeFirstOrThrow();
      await trx.updateTable('users').set({ role: 'worker' }).where('id', '=', userId).execute();
      // The worker hears that the application arrived in the same transaction that created it.
      await trx
        .insertInto('notifications')
        .values({ user_id: userId, kind: 'worker_application_received' })
        .execute();
      return worker.id;
    });
  }

  /**
   * Only workers an administrator has actually reviewed and approved are recommended: sample and
   * migrated workers are 'approved' without a review (no reviewed_at), so they never show here.
   */
  async findFeatured(limit: number): Promise<WorkerSummaryDto[]> {
    const rows = await this.summaryQuery()
      .where('w.status', '=', 'approved')
      .where('w.reviewed_at', 'is not', null)
      .where('c.is_active', '=', true)
      .having(sql<number>`count(p.id)`, '>', 0)
      .orderBy('w.rating', 'desc')
      .orderBy('w.reviews_count', 'desc')
      .orderBy('w.created_at', 'desc')
      .limit(limit)
      .execute();
    return rows.map(toDto);
  }

  async findById(id: string): Promise<WorkerSummaryDto | undefined> {
    const row = await this.summaryQuery()
      .where('w.id', '=', id)
      .where('w.status', '=', 'approved')
      .executeTakeFirst();
    return row ? toDto(row) : undefined;
  }

  private summaryQuery() {
    return this.db
      .selectFrom('workers as w')
      .innerJoin('categories as c', 'c.id', 'w.category_id')
      .leftJoin('products as p', (join) =>
        join.onRef('p.worker_id', '=', 'w.id').on('p.status', '=', 'published'),
      )
      .select([
        'w.id',
        'w.display_name',
        'w.bio',
        'w.avatar_url',
        'w.rating',
        'w.reviews_count',
        'w.status',
        'c.slug as category_slug',
        sql<number | null>`min(p.retail_price)`.as('min_price'),
        sql<number>`count(p.id)`.as('products_count'),
      ])
      .groupBy(['w.id', 'c.slug']);
  }
}
