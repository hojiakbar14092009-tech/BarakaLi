import { sql } from 'kysely';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { OrderDto } from '@barakali/shared';
import {
  createTestApp,
  deliverOrder,
  login,
  makeProduct,
  makeWorker,
  placePaidOrder,
  type Session,
  type TestApp,
} from '../../testing/helpers.js';
import { nextRating } from './feedback.service.js';

let t: TestApp;
let seller: Awaited<ReturnType<typeof makeWorker>>;
let buyer: Session;
let productId: string;

const bearer = (who: Session) => ({ Authorization: `Bearer ${who.token}` });

beforeAll(async () => {
  t = await createTestApp();
  seller = await makeWorker(t, 'Sharh Ustasi');
  buyer = await login(t.app, undefined, 'Haridor');
  productId = (await makeProduct(t, seller, { stock: 500, retailPrice: 50_000 })).id;
});
afterAll(() => t.close());

async function delivered(who: Session = buyer): Promise<string> {
  const orderId = await placePaidOrder(t, who, productId);
  await deliverOrder(t, seller, orderId);
  return orderId;
}

const review = (who: Session, orderId: string, body: unknown) =>
  request(t.app)
    .post(`/api/orders/${orderId}/review`)
    .set(bearer(who))
    .send(body as object);

const complaint = (who: Session, orderId: string, body: unknown) =>
  request(t.app)
    .post(`/api/orders/${orderId}/complaint`)
    .set(bearer(who))
    .send(body as object);

async function workerRow(id = seller.workerId) {
  return t.db
    .selectFrom('workers')
    .select(['rating', 'reviews_count'])
    .where('id', '=', id)
    .executeTakeFirstOrThrow();
}

async function reviewRows(orderId: string) {
  return t.db.selectFrom('reviews').select('id').where('order_id', '=', orderId).execute();
}

describe('review: written once after delivery', () => {
  it('saves a review for a delivered order and updates the worker rating', async () => {
    const before = await workerRow();
    const orderId = await delivered();
    const res = await review(buyer, orderId, { rating: 4, comment: 'Juda yoqdi' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      orderId,
      rating: 4,
      comment: 'Juda yoqdi',
      status: 'visible',
    });
    const after = await workerRow();
    expect(after.reviews_count).toBe(before.reviews_count + 1);
    expect(after.rating).toBe(nextRating(before.rating, before.reviews_count, 4));
  });

  it('rejects a second review for the same order and leaves the rating untouched', async () => {
    const orderId = await delivered();
    expect((await review(buyer, orderId, { rating: 5 })).status).toBe(201);
    const afterFirst = await workerRow();

    const again = await review(buyer, orderId, { rating: 1, comment: 'Fikrim oʻzgardi' });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('REVIEW_ALREADY_EXISTS');

    expect(await workerRow()).toEqual(afterFirst);
    expect(await reviewRows(orderId)).toHaveLength(1);
  });

  it('lets only one of two simultaneous submissions through', async () => {
    const orderId = await delivered();
    const before = await workerRow();
    const results = await Promise.all([
      review(buyer, orderId, { rating: 5 }),
      review(buyer, orderId, { rating: 5 }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect((await workerRow()).reviews_count).toBe(before.reviews_count + 1);
  });

  it('refuses a review before the order is delivered', async () => {
    const orderId = await placePaidOrder(t, buyer, productId);
    const res = await review(buyer, orderId, { rating: 5 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ORDER_NOT_REVIEWABLE');
    await request(t.app)
      .post(`/api/orders/${orderId}/actions`)
      .set(bearer(seller))
      .send({ action: 'accept' });
    expect((await review(buyer, orderId, { rating: 5 })).status).toBe(409);
  });

  it('only the customer of the order may review it', async () => {
    const orderId = await delivered();
    expect((await review(seller, orderId, { rating: 5 })).status).toBe(403);
    const stranger = await login(t.app);
    expect((await review(stranger, orderId, { rating: 5 })).status).toBe(404);
    const anonymous = await request(t.app)
      .post(`/api/orders/${orderId}/review`)
      .send({ rating: 5 });
    expect(anonymous.status).toBe(401);
  });

  it('validates the rating and comment on the server', async () => {
    const orderId = await delivered();
    const invalid = [
      { rating: 0 },
      { rating: 6 },
      { rating: 3.5 },
      { rating: '5' },
      {},
      { rating: 5, comment: 'x'.repeat(1001) },
    ];
    for (const body of invalid) {
      const res = await review(buyer, orderId, body);
      expect(res.status, JSON.stringify(body).slice(0, 40)).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
    expect(await reviewRows(orderId)).toHaveLength(0);
  });

  it('shows the review in the order for both sides', async () => {
    const orderId = await delivered();
    await review(buyer, orderId, { rating: 3 });
    for (const who of [buyer, seller]) {
      const res = await request(t.app).get(`/api/orders/${orderId}`).set(bearer(who));
      expect((res.body as OrderDto).review).toMatchObject({ rating: 3, orderId });
    }
  });
});

describe('review: rating transaction', () => {
  it('averages on top of the existing rating and rounds to two decimals', async () => {
    const other = await makeWorker(t, 'Reyting Ustasi');
    await t.db
      .updateTable('workers')
      .set({ rating: 4, reviews_count: 2 })
      .where('id', '=', other.workerId)
      .execute();
    const item = await makeProduct(t, other, { stock: 5 });
    const orderId = await placePaidOrder(t, buyer, item.id);
    await deliverOrder(t, other, orderId);

    await review(buyer, orderId, { rating: 5 });
    const profile = await request(t.app).get(`/api/workers/${other.workerId}`);
    expect(profile.body).toMatchObject({ rating: 4.33, reviewsCount: 3 });
  });

  it('computes the next average without floating point drift', () => {
    expect(nextRating(0, 0, 5)).toBe(5);
    expect(nextRating(4.5, 1, 4)).toBe(4.25);
    expect(nextRating(4.9, 38, 1)).toBe(4.8);
    expect(nextRating(4, 2, 5)).toBe(4.33);
    expect(nextRating(5, 1_000_000, 1)).toBe(5);
  });

  it('rolls the review back when the rating update fails', async () => {
    const orderId = await delivered();
    const before = await workerRow();
    await sql
      .raw(
        `CREATE FUNCTION fail_rating_update() RETURNS trigger LANGUAGE plpgsql AS $$
         BEGIN RAISE EXCEPTION 'rating update failed'; END $$;
         CREATE TRIGGER fail_rating BEFORE UPDATE ON workers
           FOR EACH ROW EXECUTE FUNCTION fail_rating_update();`,
      )
      .execute(t.db);
    try {
      const failed = await review(buyer, orderId, { rating: 5 });
      expect(failed.status).toBe(500);
      expect(await reviewRows(orderId)).toHaveLength(0);
      expect(await workerRow()).toEqual(before);
    } finally {
      await sql
        .raw('DROP TRIGGER fail_rating ON workers; DROP FUNCTION fail_rating_update();')
        .execute(t.db);
    }
    expect((await review(buyer, orderId, { rating: 5 })).status).toBe(201);
    expect((await workerRow()).reviews_count).toBe(before.reviews_count + 1);
  });

  it('refreshes the featured workers list after a review', async () => {
    type Featured = { id: string; reviewsCount: number }[];
    const before = (await request(t.app).get('/api/workers/featured')).body as Featured;
    const previous = before.find((w) => w.id === seller.workerId)?.reviewsCount ?? 0;
    const orderId = await delivered();
    await review(buyer, orderId, { rating: 5 });
    const after = (await request(t.app).get('/api/workers/featured')).body as Featured;
    expect(after.find((w) => w.id === seller.workerId)?.reviewsCount).toBe(previous + 1);
  });
});

describe('complaint', () => {
  it('opens a complaint with status "open" on any order of the customer', async () => {
    const orderId = await placePaidOrder(t, buyer, productId);
    const res = await complaint(buyer, orderId, { reason: 'Buyurtma kechikmoqda' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ orderId, reason: 'Buyurtma kechikmoqda', status: 'open' });
    const row = await t.db
      .selectFrom('complaints')
      .selectAll()
      .where('id', '=', res.body.id)
      .executeTakeFirstOrThrow();
    expect(row).toMatchObject({ status: 'open', user_id: buyer.userId, order_id: orderId });
  });

  it('lets the worker complain too, and only the complainant sees their complaint', async () => {
    const orderId = await placePaidOrder(t, buyer, productId);
    const filed = await complaint(seller, orderId, { reason: 'Haridor javob bermayapti' });
    expect(filed.status).toBe(201);
    const mine = await request(t.app).get(`/api/orders/${orderId}`).set(bearer(seller));
    const theirs = await request(t.app).get(`/api/orders/${orderId}`).set(bearer(buyer));
    expect((mine.body as OrderDto).complaint?.status).toBe('open');
    expect((theirs.body as OrderDto).complaint).toBeNull();
  });

  it('allows one open complaint per user and order', async () => {
    const orderId = await placePaidOrder(t, buyer, productId);
    expect((await complaint(buyer, orderId, { reason: 'Birinchi shikoyat' })).status).toBe(201);
    const again = await complaint(buyer, orderId, { reason: 'Ikkinchi shikoyat' });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('COMPLAINT_ALREADY_OPEN');
  });

  it('hides orders from strangers and validates the reason', async () => {
    const orderId = await placePaidOrder(t, buyer, productId);
    const stranger = await login(t.app);
    expect((await complaint(stranger, orderId, { reason: 'Menga aloqasi yoʻq' })).status).toBe(404);
    expect((await complaint(buyer, orderId, { reason: 'ha' })).status).toBe(400);
    expect((await complaint(buyer, orderId, { reason: 'x'.repeat(1001) })).status).toBe(400);
    expect((await complaint(buyer, orderId, {})).status).toBe(400);
    const anonymous = await request(t.app)
      .post(`/api/orders/${orderId}/complaint`)
      .send({ reason: 'Shikoyat matni' });
    expect(anonymous.status).toBe(401);
  });
});

describe('phone numbers stay private', () => {
  it('never appear in review, complaint or public worker responses', async () => {
    const orderId = await placePaidOrder(t, buyer, productId);
    const created = await complaint(buyer, orderId, { reason: 'Telefon masalasi uchun shikoyat' });
    await deliverOrder(t, seller, orderId);
    const rated = await review(buyer, orderId, { rating: 5, comment: 'Rahmat' });
    const profile = await request(t.app).get(`/api/workers/${seller.workerId}`);
    const featured = await request(t.app).get('/api/workers/featured');
    const catalog = await request(t.app).get('/api/products');

    const text = JSON.stringify([
      created.body,
      rated.body,
      profile.body,
      featured.body,
      catalog.body,
    ]);
    expect(text).not.toContain(buyer.phone);
    expect(text).not.toContain(seller.phone);
    expect(text).not.toMatch(/\+998\d{9}/);
  });

  it('stay hidden on the order until the worker accepts it', async () => {
    const orderId = await placePaidOrder(t, buyer, productId);
    await complaint(buyer, orderId, { reason: 'Savolim bor edi' });
    const res = await request(t.app).get(`/api/orders/${orderId}`).set(bearer(buyer));
    expect(res.body.status).toBe('new');
    expect(res.body.counterpart.phone).toBeNull();
    expect(JSON.stringify(res.body)).not.toContain(seller.phone);
  });
});
