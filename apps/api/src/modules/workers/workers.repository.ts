import { sql } from 'kysely';
import type { BecomeWorkerInput, WorkerSummaryDto } from '@barakali/shared';
import type { Db } from '../../db/client.js';

interface WorkerRow {
  id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  rating: number;
  reviews_count: number;
  is_verified: boolean;
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
    isVerified: row.is_verified,
    minPrice: row.min_price === null ? null : Number(row.min_price),
    productsCount: Number(row.products_count),
  };
}

export class WorkersRepository {
  constructor(private readonly db: Db) {}

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
      return worker.id;
    });
  }

  async findFeatured(limit: number): Promise<WorkerSummaryDto[]> {
    const rows = await this.summaryQuery()
      .having(sql<number>`count(p.id)`, '>', 0)
      .orderBy('w.is_verified', 'desc')
      .orderBy('w.rating', 'desc')
      .orderBy('w.reviews_count', 'desc')
      .orderBy('w.created_at', 'desc')
      .limit(limit)
      .execute();
    return rows.map(toDto);
  }

  async findById(id: string): Promise<WorkerSummaryDto | undefined> {
    const row = await this.summaryQuery().where('w.id', '=', id).executeTakeFirst();
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
        'w.is_verified',
        'c.slug as category_slug',
        sql<number | null>`min(p.retail_price)`.as('min_price'),
        sql<number>`count(p.id)`.as('products_count'),
      ])
      .groupBy(['w.id', 'c.slug']);
  }
}
