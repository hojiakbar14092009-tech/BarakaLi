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

const ADMIN_PHONE = '+998905550111';

let t: TestApp;
let admin: Session;
let customer: Session;

const bearer = (who: Session) => ({ Authorization: `Bearer ${who.token}` });
const putSettings = (body: object) =>
  request(t.app).put('/api/admin/settings').set(bearer(admin)).send(body);

beforeAll(async () => {
  t = await createTestApp({ ADMIN_PHONES: ADMIN_PHONE });
  admin = await login(t.app, ADMIN_PHONE, null);
  customer = await login(t.app, nextPhone(), 'Mijoz');
});
afterAll(() => t.close());

describe('settings', () => {
  it('starts open with no announcement, and the public endpoint mirrors the admin one', async () => {
    const pub = await request(t.app).get('/api/settings');
    expect(pub.status).toBe(200);
    expect(pub.body).toEqual({ acceptApplications: true, announcement: null });
    const full = await request(t.app).get('/api/admin/settings').set(bearer(admin));
    expect(full.body).toMatchObject({ acceptApplications: true, commissionPercent: 2 });
    expect((await request(t.app).get('/api/admin/settings')).status).toBe(401);
  });

  it('closes applications: a new worker application is refused, existing workers keep working', async () => {
    const existing = await makeWorker(t, 'Mavjud Usta');
    expect((await putSettings({ acceptApplications: false })).status).toBe(200);
    expect((await request(t.app).get('/api/settings')).body.acceptApplications).toBe(false);

    const applicant = await login(t.app, nextPhone(), 'Yangi');
    const categories = (await request(t.app).get('/api/categories')).body as { id: string }[];
    const res = await request(t.app)
      .post('/api/me/worker')
      .set(bearer(applicant))
      .send({ displayName: 'Yangi', categoryId: categories[0]?.id });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('APPLICATIONS_CLOSED');

    expect((await request(t.app).get(`/api/workers/${existing.workerId}`)).status).toBe(200);
    expect((await putSettings({ acceptApplications: true })).status).toBe(200);
    const again = await request(t.app)
      .post('/api/me/worker')
      .set(bearer(applicant))
      .send({ displayName: 'Yangi', categoryId: categories[0]?.id });
    expect(again.status).toBe(201);
  });

  it('stores the announcement in both languages, trims it and audits the change', async () => {
    const res = await putSettings({
      acceptApplications: true,
      announcementUz: '  Bayram kunlari yetkazib berish sekinroq.  ',
      announcementRu: 'В праздники доставка медленнее.',
    });
    expect(res.body.announcement).toEqual({
      uz: 'Bayram kunlari yetkazib berish sekinroq.',
      ru: 'В праздники доставка медленнее.',
    });
    expect((await request(t.app).get('/api/settings')).body.announcement.uz).toBe(
      'Bayram kunlari yetkazib berish sekinroq.',
    );
    const cleared = await putSettings({
      acceptApplications: true,
      announcementUz: '',
      announcementRu: '',
    });
    expect(cleared.body.announcement).toBeNull();
    const audit = await t.db
      .selectFrom('audit_log')
      .select('action')
      .where('action', '=', 'settings.update')
      .execute();
    expect(audit.length).toBeGreaterThanOrEqual(2);
    expect(
      (await putSettings({ acceptApplications: true, announcementUz: 'x'.repeat(301) })).status,
    ).toBe(400);
  });
});

describe('categories', () => {
  const list = async () =>
    (await request(t.app).get('/api/admin/categories').set(bearer(admin))).body as {
      id: string;
      slug: string;
      isActive: boolean;
      productsCount: number;
    }[];

  it('renames a category in both languages and the public list follows', async () => {
    const dizayn = (await list()).find((c) => c.slug === 'dizayn');
    const res = await request(t.app)
      .patch(`/api/admin/categories/${dizayn?.id}`)
      .set(bearer(admin))
      .send({ nameUz: 'Dizayn va bezak', nameRu: 'Дизайн и декор', isActive: true });
    expect(res.status).toBe(204);
    const pub = (await request(t.app).get('/api/categories')).body as {
      slug: string;
      name: { uz: string; ru: string };
    }[];
    expect(pub.find((c) => c.slug === 'dizayn')?.name).toEqual({
      uz: 'Dizayn va bezak',
      ru: 'Дизайн и декор',
    });
  });

  it('disables a category: existing products stay, new products and applicants are refused', async () => {
    const worker = await makeWorker(t, 'Pishiriq Usta');
    const all = await list();
    const pishiriq = all.find((c) => c.slug === 'pishiriq');
    const product = await request(t.app)
      .post('/api/my/products')
      .set(bearer(worker))
      .send({ title: 'Somsa', categoryId: pishiriq?.id, retailPrice: 10_000, stock: 5 });
    expect(product.status).toBe(201);

    const off = await request(t.app)
      .patch(`/api/admin/categories/${pishiriq?.id}`)
      .set(bearer(admin))
      .send({ nameUz: 'Pishiriq', nameRu: 'Выпечка', isActive: false });
    expect(off.status).toBe(204);
    const pub = (await request(t.app).get('/api/categories')).body as { slug: string }[];
    expect(pub.map((c) => c.slug)).not.toContain('pishiriq');

    const refused = await request(t.app)
      .post('/api/my/products')
      .set(bearer(worker))
      .send({ title: 'Non', categoryId: pishiriq?.id, retailPrice: 5_000, stock: 5 });
    expect(refused.status).toBe(400);
    expect(refused.body.error.details).toEqual({ categoryId: ['NOT_FOUND'] });
    const own = await request(t.app).get('/api/my/products').set(bearer(worker));
    expect((own.body as { id: string }[]).map((p) => p.id)).toContain(product.body.id);
    expect((await list()).find((c) => c.slug === 'pishiriq')).toMatchObject({
      isActive: false,
      productsCount: 1,
    });

    await request(t.app)
      .patch(`/api/admin/categories/${pishiriq?.id}`)
      .set(bearer(admin))
      .send({ nameUz: 'Pishiriq', nameRu: 'Выпечка', isActive: true });
  });
});

describe('review and complaint moderation', () => {
  async function reviewedOrder() {
    const worker = await makeWorker(t, 'Sharh Usta');
    const product = await makeProduct(t, worker, { stock: 3 });
    const orderId = await placePaidOrder(t, customer, product.id);
    await deliverOrder(t, worker, orderId);
    const review = await request(t.app)
      .post(`/api/orders/${orderId}/review`)
      .set(bearer(customer))
      .send({ rating: 2, comment: 'Kech keldi' });
    return { worker, orderId, reviewId: review.body.id as string };
  }

  it('hides a review only with a reason, keeps it, and shows it again without one', async () => {
    const { reviewId, worker } = await reviewedOrder();
    const noReason = await request(t.app)
      .patch(`/api/admin/reviews/${reviewId}`)
      .set(bearer(admin))
      .send({ status: 'hidden' });
    expect(noReason.status).toBe(400);
    const hidden = await request(t.app)
      .patch(`/api/admin/reviews/${reviewId}`)
      .set(bearer(admin))
      .send({ status: 'hidden', reason: 'Haqoratli soʻzlar bor' });
    expect(hidden.status).toBe(204);
    const row = await t.db
      .selectFrom('reviews')
      .select(['status', 'moderation_reason'])
      .where('id', '=', reviewId)
      .executeTakeFirstOrThrow();
    expect(row).toEqual({ status: 'hidden', moderation_reason: 'Haqoratli soʻzlar bor' });
    const listed = await request(t.app).get('/api/admin/reviews?status=hidden').set(bearer(admin));
    expect(listed.body.items.find((r: { id: string }) => r.id === reviewId)).toMatchObject({
      moderationReason: 'Haqoratli soʻzlar bor',
    });
    const publicReviews = await request(t.app).get(`/api/workers/${worker.workerId}/reviews`);
    const publicIds = ((publicReviews.body.items ?? publicReviews.body) as { id: string }[]).map(
      (r) => r.id,
    );
    expect(publicIds).not.toContain(reviewId);

    const shown = await request(t.app)
      .patch(`/api/admin/reviews/${reviewId}`)
      .set(bearer(admin))
      .send({ status: 'visible' });
    expect(shown.status).toBe(204);
    const back = await t.db
      .selectFrom('reviews')
      .select('moderation_reason')
      .where('id', '=', reviewId)
      .executeTakeFirstOrThrow();
    expect(back.moderation_reason).toBeNull();
  });

  it('walks a complaint from new to in review to resolved with a note, and refuses to reopen', async () => {
    const worker = await makeWorker(t, 'Shikoyat Usta');
    const product = await makeProduct(t, worker, { stock: 3 });
    const orderId = await placePaidOrder(t, customer, product.id);
    const complaint = await request(t.app)
      .post(`/api/orders/${orderId}/complaint`)
      .set(bearer(customer))
      .send({ reason: 'Buyurtma kelmadi' });
    const id = complaint.body.id as string;
    const patch = (body: object) =>
      request(t.app).patch(`/api/admin/complaints/${id}`).set(bearer(admin)).send(body);

    expect((await patch({ status: 'in_review' })).status).toBe(204);
    expect((await patch({ status: 'in_review' })).status).toBe(409);
    expect(
      (await patch({ status: 'resolved', adminNote: 'Hunarmand bilan gaplashildi' })).status,
    ).toBe(204);
    expect((await patch({ status: 'dismissed' })).status).toBe(409);

    const listed = await request(t.app).get('/api/admin/complaints').set(bearer(admin));
    expect(listed.body.items.find((c: { id: string }) => c.id === id)).toMatchObject({
      status: 'resolved',
      adminNote: 'Hunarmand bilan gaplashildi',
    });
    const audit = await t.db
      .selectFrom('audit_log')
      .select('details')
      .where('target_id', '=', id)
      .orderBy('created_at', 'desc')
      .executeTakeFirstOrThrow();
    expect(audit.details).toMatchObject({ from: 'in_review', to: 'resolved' });
    // The customer sees the final state on the order.
    const order = await request(t.app).get(`/api/orders/${orderId}`).set(bearer(customer));
    expect(order.body.complaint.status).toBe('resolved');
  });
});
