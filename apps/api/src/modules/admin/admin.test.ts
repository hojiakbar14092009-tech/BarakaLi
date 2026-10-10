import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createTestApp,
  deliverOrder,
  login,
  makeProduct,
  makeWorker,
  nextPhone,
  placePaidOrder,
  type Session,
  type TestApp,
} from '../../testing/helpers.js';
import { nextRating } from '../feedback/feedback.service.js';
import { ratingWithout } from './admin.service.js';

const ADMIN_PHONE = '+998901112233';

let t: TestApp;
let admin: Session;
let seller: Awaited<ReturnType<typeof makeWorker>>;
let buyer: Session;

const bearer = (who: Session) => ({ Authorization: `Bearer ${who.token}` });

beforeAll(async () => {
  t = await createTestApp({ ADMIN_PHONES: ADMIN_PHONE });
  admin = await login(t.app, ADMIN_PHONE, 'Admin');
  seller = await makeWorker(t, 'Sotuvchi');
  buyer = await login(t.app, nextPhone(), 'Haridor');
});
afterAll(() => t.close());

describe('access control', () => {
  it('rejects anonymous, customer and worker callers on every admin route', async () => {
    const paths = [
      '/api/admin/stats',
      '/api/admin/workers',
      '/api/admin/orders',
      '/api/admin/reviews',
      '/api/admin/complaints',
      '/api/admin/materials',
      '/api/admin/material-orders',
    ];
    for (const path of paths) {
      expect((await request(t.app).get(path)).status).toBe(401);
      expect((await request(t.app).get(path).set(bearer(buyer))).status).toBe(403);
      expect((await request(t.app).get(path).set(bearer(seller))).status).toBe(403);
      expect((await request(t.app).get(path).set(bearer(admin))).status).toBe(200);
    }
  });

  it('gives the admin role only to phones listed in ADMIN_PHONES', async () => {
    const me = await request(t.app).get('/api/me').set(bearer(admin));
    expect(me.body.role).toBe('admin');
    expect((await request(t.app).get('/api/me').set(bearer(buyer))).body.role).toBe('customer');
  });

  it('blocks a customer from mutating admin resources', async () => {
    const res = await request(t.app)
      .post(`/api/admin/workers/${seller.workerId}/approve`)
      .set(bearer(buyer));
    expect(res.status).toBe(403);
  });
});

describe('review moderation', () => {
  it('hides a review, takes it out of the rating and public list, and restores it', async () => {
    const worker = await makeWorker(t, 'Baholangan');
    const product = await makeProduct(t, worker);
    const orderIds: string[] = [];
    for (const rating of [5, 3]) {
      const customer = await login(t.app, nextPhone(), 'Mijoz Ismoilov');
      const orderId = await placePaidOrder(t, customer, product.id);
      await deliverOrder(t, worker, orderId);
      await request(t.app)
        .post(`/api/orders/${orderId}/review`)
        .set(bearer(customer))
        .send({ rating, comment: `Baho ${rating}` });
      orderIds.push(orderId);
    }
    const before = await request(t.app).get(`/api/workers/${worker.workerId}`);
    expect(before.body).toMatchObject({ rating: 4, reviewsCount: 2 });

    const list = await request(t.app).get('/api/admin/reviews?status=visible').set(bearer(admin));
    const lowReview = list.body.items.find((r: { rating: number }) => r.rating === 3);
    const hide = await request(t.app)
      .patch(`/api/admin/reviews/${lowReview.id}`)
      .set(bearer(admin))
      .send({ status: 'hidden' });
    expect(hide.status).toBe(204);

    const after = await request(t.app).get(`/api/workers/${worker.workerId}`);
    expect(after.body).toMatchObject({ rating: 5, reviewsCount: 1 });
    const publicList = await request(t.app).get(`/api/workers/${worker.workerId}/reviews`);
    expect(publicList.body.total).toBe(1);
    expect(publicList.body.items[0]).toMatchObject({ rating: 5, authorName: 'Mijoz' });

    // Hiding twice must not move the rating again.
    await request(t.app)
      .patch(`/api/admin/reviews/${lowReview.id}`)
      .set(bearer(admin))
      .send({ status: 'hidden' });
    const again = await request(t.app).get(`/api/workers/${worker.workerId}`);
    expect(again.body).toMatchObject({ rating: 5, reviewsCount: 1 });

    await request(t.app)
      .patch(`/api/admin/reviews/${lowReview.id}`)
      .set(bearer(admin))
      .send({ status: 'visible' });
    const restored = await request(t.app).get(`/api/workers/${worker.workerId}`);
    expect(restored.body).toMatchObject({ rating: 4, reviewsCount: 2 });
  });

  it('keeps rating maths consistent in both directions', () => {
    expect(ratingWithout(4, 2, 3)).toBe(5);
    expect(ratingWithout(5, 1, 5)).toBe(0);
    expect(nextRating(ratingWithout(4.33, 3, 4), 2, 4)).toBeCloseTo(4.33, 1);
  });
});

describe('complaints and manual refund', () => {
  it('refunds a paid in-progress order once and closes the complaint', async () => {
    const product = await makeProduct(t, seller, { stock: 5 });
    const orderId = await placePaidOrder(t, buyer, product.id, 2);
    await request(t.app)
      .post(`/api/orders/${orderId}/actions`)
      .set(bearer(seller))
      .send({ action: 'accept' });
    const complaint = await request(t.app)
      .post(`/api/orders/${orderId}/complaint`)
      .set(bearer(buyer))
      .send({ reason: 'Ish sifatsiz bajarildi' });
    expect(complaint.status).toBe(201);

    const open = await request(t.app).get('/api/admin/complaints?status=open').set(bearer(admin));
    expect(open.body.items.find((c: { id: string }) => c.id === complaint.body.id)).toMatchObject({
      orderStatus: 'accepted',
      paymentStatus: 'paid',
      authorRole: 'customer',
    });

    const stockBefore = await t.db
      .selectFrom('products')
      .select('stock')
      .where('id', '=', product.id)
      .executeTakeFirstOrThrow();
    const refund = await request(t.app)
      .post(`/api/admin/orders/${orderId}/refund`)
      .set(bearer(admin));
    expect(refund.status).toBe(201);
    const stockAfter = await t.db
      .selectFrom('products')
      .select('stock')
      .where('id', '=', product.id)
      .executeTakeFirstOrThrow();
    expect(stockAfter.stock).toBe(stockBefore.stock + 2);
    const order = await request(t.app).get(`/api/orders/${orderId}`).set(bearer(buyer));
    expect(order.body).toMatchObject({ status: 'refunded', paymentStatus: 'refunded' });

    const second = await request(t.app)
      .post(`/api/admin/orders/${orderId}/refund`)
      .set(bearer(admin));
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('ORDER_NOT_REFUNDABLE');

    const resolve = await request(t.app)
      .patch(`/api/admin/complaints/${complaint.body.id}`)
      .set(bearer(admin))
      .send({ status: 'resolved' });
    expect(resolve.status).toBe(204);
    const again = await request(t.app)
      .patch(`/api/admin/complaints/${complaint.body.id}`)
      .set(bearer(admin))
      .send({ status: 'dismissed' });
    expect(again.body.error.code).toBe('COMPLAINT_NOT_OPEN');
  });

  it('refuses to refund an unpaid or delivered order', async () => {
    const product = await makeProduct(t, seller, { stock: 5 });
    const unpaid = await request(t.app)
      .post('/api/orders')
      .set(bearer(buyer))
      .send({ items: [{ productId: product.id, quantity: 1 }], fulfillment: 'pickup' });
    const res = await request(t.app)
      .post(`/api/admin/orders/${unpaid.body[0].id}/refund`)
      .set(bearer(admin));
    expect(res.status).toBe(409);

    const delivered = await placePaidOrder(t, buyer, product.id);
    await deliverOrder(t, seller, delivered);
    const late = await request(t.app)
      .post(`/api/admin/orders/${delivered}/refund`)
      .set(bearer(admin));
    expect(late.body.error.code).toBe('ORDER_NOT_REFUNDABLE');
  });

  it('only admits worker accept/start/ready/deliver actions, not refunds, via the worker route', async () => {
    const product = await makeProduct(t, seller, { stock: 5 });
    const orderId = await placePaidOrder(t, buyer, product.id);
    await request(t.app)
      .post(`/api/orders/${orderId}/actions`)
      .set(bearer(seller))
      .send({ action: 'accept' });
    const reject = await request(t.app)
      .post(`/api/orders/${orderId}/actions`)
      .set(bearer(seller))
      .send({ action: 'reject' });
    expect(reject.status).toBe(409);
  });
});

describe('statistics and order list', () => {
  it('reports counts, turnover and commission from recorded earnings', async () => {
    const product = await makeProduct(t, seller, { retailPrice: 100_000, stock: 5 });
    const orderId = await placePaidOrder(t, buyer, product.id);
    await deliverOrder(t, seller, orderId);

    const stats = await request(t.app).get('/api/admin/stats').set(bearer(admin));
    expect(stats.status).toBe(200);
    expect(stats.body.commission).toBeGreaterThanOrEqual(2_000);
    expect(stats.body.turnover).toBeGreaterThanOrEqual(100_000);
    expect(stats.body.ordersToday).toBeGreaterThanOrEqual(1);
    expect(stats.body.ordersByStatus.delivered).toBeGreaterThanOrEqual(1);
    expect(stats.body.workers).toBeGreaterThanOrEqual(2);

    const orders = await request(t.app)
      .get('/api/admin/orders?status=delivered')
      .set(bearer(admin));
    expect(orders.body.items.length).toBeGreaterThan(0);
    for (const order of orders.body.items) expect(order.status).toBe('delivered');
  });
});
