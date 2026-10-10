import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NotificationsDto, OrderDto, WorkerSummaryDto } from '@barakali/shared';
import {
  createTestApp,
  login,
  makeProduct,
  makeWorker,
  nextPhone,
  placePaidOrder,
  type Session,
  type TestApp,
} from '../../testing/helpers.js';

const ADMIN_PHONE = '+998905550011';
const REASON = 'Profil maʼlumotlari toʻliq emas';

let t: TestApp;
let admin: Session;
let customer: Session;

const bearer = (who: Session) => ({ Authorization: `Bearer ${who.token}` });
const inbox = async (who: Session) =>
  (await request(t.app).get('/api/my/notifications').set(bearer(who))).body as NotificationsDto;

async function publishedProductOf(worker: Awaited<ReturnType<typeof makeWorker>>) {
  return makeProduct(t, worker, { stock: 5 });
}

const approve = (workerId: string, who: Session = admin) =>
  request(t.app).post(`/api/admin/workers/${workerId}/approve`).set(bearer(who));
const reject = (workerId: string, reason: unknown, who: Session = admin) =>
  request(t.app).post(`/api/admin/workers/${workerId}/reject`).set(bearer(who)).send({ reason });

beforeAll(async () => {
  t = await createTestApp({ ADMIN_PHONES: ADMIN_PHONE });
  admin = await login(t.app, ADMIN_PHONE, 'Admin');
  customer = await login(t.app, nextPhone(), 'Mijoz');
});
afterAll(() => t.close());

describe('application lifecycle', () => {
  it('starts pending and tells the applicant the application was received', async () => {
    const applicant = await makeWorker(t, 'Yangi usta', { approved: false });
    const me = await request(t.app).get('/api/me').set(bearer(applicant));
    expect(me.body).toMatchObject({ workerStatus: 'pending', workerRejectReason: null });
    const mine = await inbox(applicant);
    expect(mine.items.map((n) => n.kind)).toContain('worker_application_received');
    expect(mine.unread).toBe(1);
  });

  it('approves with reviewer and time recorded and notifies the worker', async () => {
    const applicant = await makeWorker(t, 'Tasdiqlanadigan', { approved: false });
    const res = await approve(applicant.workerId);
    expect(res.status).toBe(204);

    const row = await t.db
      .selectFrom('workers')
      .select(['status', 'reviewed_by', 'reviewed_at', 'reject_reason'])
      .where('id', '=', applicant.workerId)
      .executeTakeFirstOrThrow();
    expect(row.status).toBe('approved');
    expect(row.reviewed_by).toBe(admin.userId);
    expect(row.reviewed_at).toBeInstanceOf(Date);
    expect(row.reject_reason).toBeNull();
    expect((await inbox(applicant)).items.map((n) => n.kind)).toContain('worker_approved');
    const me = await request(t.app).get('/api/me').set(bearer(applicant));
    expect(me.body.workerStatus).toBe('approved');
  });

  it('rejects with a reason of at least 10 characters, stored and shown to the worker', async () => {
    const applicant = await makeWorker(t, 'Rad etiladigan', { approved: false });
    expect((await reject(applicant.workerId, REASON)).status).toBe(204);
    const row = await t.db
      .selectFrom('workers')
      .select(['status', 'reviewed_by', 'reviewed_at', 'reject_reason'])
      .where('id', '=', applicant.workerId)
      .executeTakeFirstOrThrow();
    expect(row).toMatchObject({
      status: 'rejected',
      reviewed_by: admin.userId,
      reject_reason: REASON,
    });
    expect(row.reviewed_at).toBeInstanceOf(Date);

    const me = await request(t.app).get('/api/me').set(bearer(applicant));
    expect(me.body).toMatchObject({ workerStatus: 'rejected', workerRejectReason: REASON });
    const note = (await inbox(applicant)).items.find((n) => n.kind === 'worker_rejected');
    expect(note?.detail).toBe(REASON);
  });

  it('refuses a rejection without a reason, or with a short one (400)', async () => {
    const applicant = await makeWorker(t, 'Sababsiz', { approved: false });
    for (const reason of [undefined, '', '   ', 'qisqa', '123456789']) {
      const res = await reject(applicant.workerId, reason);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
    const row = await t.db
      .selectFrom('workers')
      .select(['status', 'reviewed_by'])
      .where('id', '=', applicant.workerId)
      .executeTakeFirstOrThrow();
    expect(row).toMatchObject({ status: 'pending', reviewed_by: null });
  });

  it('refuses the same decisions at the database level', async () => {
    const applicant = await makeWorker(t, 'Baza', { approved: false });
    await expect(
      t.db
        .updateTable('workers')
        .set({ status: 'rejected', reject_reason: 'qisqa' })
        .where('id', '=', applicant.workerId)
        .execute(),
    ).rejects.toMatchObject({ constraint: 'workers_reject_reason_required' });
  });

  it('filters the admin list by pending, approved and rejected', async () => {
    const pending = await makeWorker(t, 'Kutmoqda', { approved: false });
    const rejected = await makeWorker(t, 'Rad', { approved: false });
    await reject(rejected.workerId, REASON);
    const ids = async (status: string) =>
      (
        (await request(t.app).get(`/api/admin/workers?status=${status}`).set(bearer(admin))).body
          .items as { id: string }[]
      ).map((w) => w.id);

    expect(await ids('pending')).toContain(pending.workerId);
    expect(await ids('pending')).not.toContain(rejected.workerId);
    expect(await ids('rejected')).toContain(rejected.workerId);
    expect(await ids('approved')).not.toContain(pending.workerId);
    const item = (
      await request(t.app).get('/api/admin/workers?status=rejected').set(bearer(admin))
    ).body.items.find((w: { id: string }) => w.id === rejected.workerId);
    expect(item).toMatchObject({ status: 'rejected', rejectReason: REASON });
  });
});

describe('admin-only', () => {
  it('answers 403 to ordinary users and workers, 401 to anonymous', async () => {
    const worker = await makeWorker(t, 'Oddiy usta');
    for (const [who, status] of [
      [customer, 403],
      [worker, 403],
    ] as const) {
      expect((await request(t.app).get('/api/admin/workers').set(bearer(who))).status).toBe(status);
      expect((await approve(worker.workerId, who)).status).toBe(status);
      expect((await reject(worker.workerId, REASON, who)).status).toBe(status);
    }
    expect((await request(t.app).get('/api/admin/workers')).status).toBe(401);
    expect(
      (await request(t.app).post(`/api/admin/workers/${worker.workerId}/approve`)).status,
    ).toBe(401);
  });

  it('does not let a worker approve their own application', async () => {
    const applicant = await makeWorker(t, 'Oʻzi', { approved: false });
    expect((await approve(applicant.workerId, applicant)).status).toBe(403);
    const me = await request(t.app).get('/api/me').set(bearer(applicant));
    expect(me.body.workerStatus).toBe('pending');
  });
});

describe('visibility: only approved workers are public', () => {
  it('hides a pending worker everywhere, then shows them once approved', async () => {
    const applicant = await makeWorker(t, 'Katalog usta', { approved: false });
    const product = await publishedProductOf(applicant);

    const catalog = async () =>
      (await request(t.app).get('/api/products?pageSize=20')).body.items as { id: string }[];
    const featured = async () =>
      (await request(t.app).get('/api/workers/featured')).body as WorkerSummaryDto[];
    const hidden = async () => {
      expect((await catalog()).map((p) => p.id)).not.toContain(product.id);
      expect((await featured()).map((w) => w.id)).not.toContain(applicant.workerId);
      expect(
        (await request(t.app).get(`/api/products?workerId=${applicant.workerId}`)).body.total,
      ).toBe(0);
      expect((await request(t.app).get(`/api/products/${product.id}`)).status).toBe(404);
      expect((await request(t.app).get(`/api/workers/${applicant.workerId}`)).status).toBe(404);
      expect(
        (await request(t.app).get(`/api/workers/${applicant.workerId}/availability`)).status,
      ).toBe(404);
      expect((await request(t.app).get(`/api/workers/${applicant.workerId}/reviews`)).status).toBe(
        404,
      );
    };

    await hidden();
    // The owner still sees their own product while waiting.
    const own = await request(t.app).get(`/api/products/${product.id}`).set(bearer(applicant));
    expect(own.status).toBe(200);

    await reject(applicant.workerId, REASON);
    await hidden();

    expect((await approve(applicant.workerId)).status).toBe(204);
    expect((await catalog()).map((p) => p.id)).toContain(product.id);
    expect((await featured()).map((w) => w.id)).toContain(applicant.workerId);
    const profile = await request(t.app).get(`/api/workers/${applicant.workerId}`);
    expect(profile.body).toMatchObject({ id: applicant.workerId, isVerified: true });
    expect((await request(t.app).get(`/api/products/${product.id}`)).status).toBe(200);
  });

  it('shows the "verified" badge only for approved workers (there is no hand-set flag)', async () => {
    const worker = await makeWorker(t, 'Belgi');
    const product = await publishedProductOf(worker);
    const res = await request(t.app).get(`/api/products/${product.id}`);
    expect(res.body.worker.isVerified).toBe(true);
    const columns = await t.db
      .selectFrom('information_schema.columns' as never)
      .select('column_name' as never)
      .where('table_name' as never, '=', 'workers' as never)
      .execute();
    expect((columns as { column_name: string }[]).map((c) => c.column_name)).not.toContain(
      'is_verified',
    );
  });
});

describe('ordering requires an approved worker', () => {
  it('refuses a new order for a rejected worker’s product and for a service request', async () => {
    const worker = await makeWorker(t, 'Rad etilgan usta');
    const product = await publishedProductOf(worker);
    await reject(worker.workerId, REASON);

    const order = await request(t.app)
      .post('/api/orders')
      .set(bearer(customer))
      .send({ items: [{ productId: product.id, quantity: 1 }], fulfillment: 'pickup' });
    expect(order.status).toBe(404);
    expect(order.body.error.code).toBe('PRODUCT_UNAVAILABLE');

    const service = await request(t.app)
      .post('/api/orders/service')
      .set(bearer(customer))
      .send({
        workerId: worker.workerId,
        description: 'Koylak tikish',
        startTime: new Date(Date.now() + 3 * 86_400_000).toISOString(),
        hours: 1,
      });
    expect(service.status).toBe(404);
  });

  it('refuses a pending worker too', async () => {
    const worker = await makeWorker(t, 'Kutayotgan usta', { approved: false });
    const product = await publishedProductOf(worker);
    const order = await request(t.app)
      .post('/api/orders')
      .set(bearer(customer))
      .send({ items: [{ productId: product.id, quantity: 1 }], fulfillment: 'pickup' });
    expect(order.status).toBe(404);
  });

  it('stops a worker who was rejected after the customer paid from accepting', async () => {
    const worker = await makeWorker(t, 'Keyin rad');
    const product = await publishedProductOf(worker);
    const orderId = await placePaidOrder(t, customer, product.id);
    await reject(worker.workerId, REASON);

    const accept = await request(t.app)
      .post(`/api/orders/${orderId}/actions`)
      .set(bearer(worker))
      .send({ action: 'accept' });
    expect(accept.status).toBe(403);
    expect(accept.body.error.code).toBe('WORKER_NOT_APPROVED');
    const view = await request(t.app).get(`/api/orders/${orderId}`).set(bearer(customer));
    expect((view.body as OrderDto).status).toBe('new');
  });

  it('lets an approved worker accept as before', async () => {
    const worker = await makeWorker(t, 'Tasdiqlangan usta');
    const product = await publishedProductOf(worker);
    const orderId = await placePaidOrder(t, customer, product.id);
    const accept = await request(t.app)
      .post(`/api/orders/${orderId}/actions`)
      .set(bearer(worker))
      .send({ action: 'accept' });
    expect(accept.status).toBe(200);
  });
});
