import { REVIEWS_PAGE_SIZE, type Page, type PublicReviewDto } from '@barakali/shared';
import type { Db } from '../../db/client.js';

/** Only the first word of the customer's name is shown publicly. */
function firstName(name: string | null): string | null {
  const word = name?.trim().split(/\s+/)[0];
  return word ? word : null;
}

export class ReviewsReader {
  constructor(private readonly db: Db) {}

  async listVisible(workerId: string, page: number): Promise<Page<PublicReviewDto>> {
    const base = this.db
      .selectFrom('reviews as r')
      .innerJoin('users as u', 'u.id', 'r.customer_id')
      .where('r.worker_id', '=', workerId)
      .where('r.status', '=', 'visible');
    const [rows, total] = await Promise.all([
      base
        .select(['r.id', 'r.rating', 'r.comment', 'r.created_at', 'u.name as author_name'])
        .orderBy('r.created_at', 'desc')
        .limit(REVIEWS_PAGE_SIZE)
        .offset((page - 1) * REVIEWS_PAGE_SIZE)
        .execute(),
      base.select((eb) => eb.fn.countAll().as('n')).executeTakeFirstOrThrow(),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        rating: row.rating,
        comment: row.comment,
        authorName: firstName(row.author_name),
        createdAt: row.created_at.toISOString(),
      })),
      page,
      pageSize: REVIEWS_PAGE_SIZE,
      total: Number(total.n),
    };
  }
}
