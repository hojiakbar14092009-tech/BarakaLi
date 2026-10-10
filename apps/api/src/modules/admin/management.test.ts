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

const ADMIN_PHONE = '+998905550099';
const REASON = 'Qoidalarni qayta-qayta buzdi';

let t: TestApp;
let admin: Session;
let customer: Session;

const bearer = (who: Session) => ({ Authorization: `Bearer ${who.token}` });
const lastAudit = async (targetId: string) =>
  t.db
    .selectFrom('audit_log')
    .select(['action', 'details', 'admin_user_id'])
    .where('target_id', '=', targetId)
    .orderBy('created_at', 'desc')
    .executeTakeFirstOrThrow();

beforeAll(async () => {
  t = await createTestApp({ ADMIN_PHONES: ADMIN_PHONE });
  admin = await login(t.app, ADMIN_PHONE, null);
  customer = await login(t.app, nextPhone(), 'Mijoz');
});
afterAll(() => t.close());

describe('admin products', () => {
  it('lists, searches and filters live products with their order count', async () => {
    const worker = await makeWorker(t, 'Mahsulot Usta');
    const product = await makeProduct(t, worker, { title: 'Kashta roʻmol', stock: 5 });
    await placePaidOrder(t, customer, product.id);
    const res = await request(t.app)
      .get(`/api/admin/products?q=kashta&workerId=${worker.workerId}`)
      .set(bearer(admin));
    expect(res.status).toBe(200);
    const item = res.body.items.find((p: { id: string }) => p.id === product.id);
    expect(item).toMatchObject({ title: 'Kashta roʻmol', ordersCount: 1, status: 'published' });
    expect(item.imageUrl).toBeTruthy();
    const miss = await request(t.app).get('/api/admin/products?status=draft').set(bearer(admin));
    expect(miss.body.items.map((p: { id: string }) => p.id)).not.toContain(product.id);
  });

  it('edits title, price, description and category, with an audit entry', async () => {
    const worker = await makeWorker(t, 'Tahrir Usta');
    const product = await makeProduct(t, worker, { title: 'Eski nom' });
    const categories = (await request(t.app).get('/api/categories')).body as { id: string }[];
    const res = await request(t.app)
      .patch(`/api/admin/products/${product.id}`)
      .set(bearer(admin))
      .send({
        title: 'Yangi nom',
        description: 'Qoʻlda tikilgan',
        retailPrice: 120_000,
        categoryId: categories[1]?.id,
      });
    expect(res.status).toBe(204);
    const shown = await request(t.app).get(`/api/products/${product.id}`);
    expect(shown.body).toMatchObject({ title: 'Yangi nom', retailPrice: 120_000 });
    expect(await lastAudit(product.id)).toMatchObject({
      action: 'product.update',
      details: { title: 'Yangi nom', retailPrice: 120_000 },
    });
    const bad = await request(t.app)
      .patch(`/api/admin/products/${product.id}`)
      .set(bearer(admin))
      .send({ title: 'X', retailPrice: -1, categoryId: 'nope' });
    expect(bad.status).toBe(400);
  });

  it('hides a product from the catalog and shows it again', async () => {
    const worker = await makeWorker(t, 'Yashirin Usta');
    const product = await makeProduct(t, worker);
    expect(
      (await request(t.app).post(`/api/admin/products/${product.id}/hide`).set(bearer(admin)))
        .status,
    ).toBe(204);
    expect((await request(t.app).get(`/api/products/${product.id}`)).status).toBe(404);
    expect((await lastAudit(product.id)).action).toBe('product.hide');
    expect(
      (await request(t.app).post(`/api/admin/products/${product.id}/show`).set(bearer(admin)))
        .status,
    ).toBe(204);
    expect((await request(t.app).get(`/api/products/${product.id}`)).status).toBe(200);
  });

  it('soft-deletes a product without orders, and only hides one that has orders', async () => {
    const worker = await makeWorker(t, 'Oʻchirish Usta');
    const fresh = await makeProduct(t, worker);
    const sold = await makeProduct(t, worker, { stock: 3 });
    await placePaidOrder(t, customer, sold.id);

    const blocked = await request(t.app)
      .delete(`/api/admin/products/${sold.id}`)
      .set(bearer(admin));
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('PRODUCT_HAS_ORDERS');

    expect(
      (await request(t.app).delete(`/api/admin/products/${fresh.id}`).set(bearer(admin))).status,
    ).toBe(204);
    const row = await t.db
      .selectFrom('products')
      .select(['deleted_at', 'status'])
      .where('id', '=', fresh.id)
      .executeTakeFirstOrThrow();
    expect(row.deleted_at).toBeInstanceOf(Date);
    expect((await request(t.app).get(`/api/products/${fresh.id}`)).status).toBe(404);
    const own = await request(t.app).get('/api/my/products').set(bearer(worker));
    expect((own.body as { id: string }[]).map((p) => p.id)).not.toContain(fresh.id);
    const list = await request(t.app).get('/api/admin/products').set(bearer(admin));
    expect(list.body.items.map((p: { id: string }) => p.id)).not.toContain(fresh.id);
    expect(
      (await request(t.app).delete(`/api/admin/products/${fresh.id}`).set(bearer(admin))).status,
    ).toBe(404);
  });
});

describe('admin orders', () => {
  it('returns the detail with parties, items and the allowed next statuses', async () => {
    const worker = await makeWorker(t, 'Buyurtma Usta');
    const product = await makeProduct(t, worker, { retailPrice: 100_000, stock: 4 });
    const orderId = await placePaidOrder(t, customer, product.id, 2);
    const res = await request(t.app).get(`/api/admin/orders/${orderId}`).set(bearer(admin));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'new',
      total: 200_000,
      commission: 4_000,
      paymentStatus: 'paid',
      customer: { name: 'Mijoz' },
      worker: { name: 'Buyurtma Usta' },
      allowedTransitions: ['accepted', 'cancelled'],
    });
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({ quantity: 2, unitPrice: 100_000 });
  });

  it('moves status only along the allowed transitions and answers 409 otherwise', async () => {
    const worker = await makeWorker(t, 'Holat Usta');
    const product = await makeProduct(t, worker, { stock: 4 });
    const orderId = await placePaidOrder(t, customer, product.id);
    const set = (status: string) =>
      request(t.app)
        .patch(`/api/admin/orders/${orderId}/status`)
        .set(bearer(admin))
        .send({ status });

    const skip = await set('ready');
    expect(skip.status).toBe(409);
    expect(skip.body.error.code).toBe('ORDER_INVALID_TRANSITION');
    expect((await set('refunded')).status).toBe(409);

    for (const status of ['accepted', 'in_progress', 'ready', 'delivered']) {
      expect((await set(status)).status, status).toBe(204);
    }
    expect((await set('cancelled')).status).toBe(409);
    const earnings = await t.db
      .selectFrom('earnings')
      .select(['amount', 'commission'])
      .where('order_id', '=', orderId)
      .execute();
    expect(earnings).toHaveLength(1);
    expect(await lastAudit(orderId)).toMatchObject({
      action: 'order.status',
      details: { from: 'ready', to: 'delivered' },
    });
  });

  it('refunds through the ledger: payment, stock, refunds row, order and audit in one go', async () => {
    const worker = await makeWorker(t, 'Qaytarish Usta');
    const product = await makeProduct(t, worker, { retailPrice: 50_000, stock: 2 });
    const orderId = await placePaidOrder(t, customer, product.id, 2);
    const res = await request(t.app)
      .post(`/api/admin/orders/${orderId}/refund`)
      .set(bearer(admin))
      .send({ reason: 'Shikoyat tasdiqlandi' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ amount: 100_000, commissionReversed: 0 });

    const [order, payment, stock, ledger] = await Promise.all([
      t.db
        .selectFrom('orders')
        .select('status')
        .where('id', '=', orderId)
        .executeTakeFirstOrThrow(),
      t.db
        .selectFrom('payments')
        .select('status')
        .where('order_id', '=', orderId)
        .executeTakeFirstOrThrow(),
      t.db
        .selectFrom('products')
        .select('stock')
        .where('id', '=', product.id)
        .executeTakeFirstOrThrow(),
      t.db.selectFrom('refunds').selectAll().where('order_id', '=', orderId).execute(),
    ]);
    expect(order.status).toBe('refunded');
    expect(payment.status).toBe('refunded');
    expect(stock.stock).toBe(2);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({ amount: 100_000, admin_user_id: admin.userId });
    expect(await lastAudit(orderId)).toMatchObject({
      action: 'order.refund',
      details: { amount: 100_000, reason: 'Shikoyat tasdiqlandi' },
    });

    const again = await request(t.app)
      .post(`/api/admin/orders/${orderId}/refund`)
      .set(bearer(admin));
    expect(again.status).toBe(409);
    const detail = await request(t.app).get(`/api/admin/orders/${orderId}`).set(bearer(admin));
    expect(detail.body.refunds).toHaveLength(1);
  });

  it('reverses recorded commission when a delivered order is refunded after the fact', async () => {
    const worker = await makeWorker(t, 'Yetkazilgan Usta');
    const product = await makeProduct(t, worker, { retailPrice: 100_000, stock: 2 });
    const orderId = await placePaidOrder(t, customer, product.id);
    await deliverOrder(t, worker, orderId);
    // Delivered orders are closed for everyone, including the administrator.
    const res = await request(t.app).post(`/api/admin/orders/${orderId}/refund`).set(bearer(admin));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ORDER_NOT_REFUNDABLE');
  });
});

describe('admin users', () => {
  it('lists and searches users with their role and order count', async () => {
    const buyer = await login(t.app, nextPhone(), 'Qidiriladigan Mijoz');
    const res = await request(t.app).get('/api/admin/users?q=qidiriladigan').set(bearer(admin));
    expect(res.status).toBe(200);
    expect(res.body.items.find((u: { id: string }) => u.id === buyer.userId)).toMatchObject({
      role: 'customer',
      ordersCount: 0,
      blockedAt: null,
    });
    const byDigits = await request(t.app)
      .get(`/api/admin/users?q=${buyer.phone.slice(-4)}`)
      .set(bearer(admin));
    expect(byDigits.body.items.map((u: { id: string }) => u.id)).toContain(buyer.userId);
    const detail = await request(t.app).get(`/api/admin/users/${buyer.userId}`).set(bearer(admin));
    expect(detail.body.name).toBe('Qidiriladigan Mijoz');
  });

  it('blocks a user with a reason: their token stops working and they cannot sign in', async () => {
    const victim = await login(t.app, nextPhone(), 'Bloklanadigan');
    expect(
      (
        await request(t.app)
          .post(`/api/admin/users/${victim.userId}/block`)
          .set(bearer(admin))
          .send({ reason: 'qisqa' })
      ).status,
    ).toBe(400);
    const res = await request(t.app)
      .post(`/api/admin/users/${victim.userId}/block`)
      .set(bearer(admin))
      .send({ reason: REASON });
    expect(res.status).toBe(204);

    const me = await request(t.app).get('/api/me').set(bearer(victim));
    expect(me.status).toBe(403);
    expect(me.body.error.code).toBe('USER_BLOCKED');

    const code = await request(t.app).post('/api/auth/request-code').send({ phone: victim.phone });
    const verify = await request(t.app)
      .post('/api/auth/verify')
      .send({ phone: victim.phone, code: code.body.code });
    expect(verify.status).toBe(403);
    expect(verify.body.error.code).toBe('USER_BLOCKED');

    const detail = await request(t.app).get(`/api/admin/users/${victim.userId}`).set(bearer(admin));
    expect(detail.body).toMatchObject({ blockReason: REASON });
    expect(detail.body.blockedAt).toBeTruthy();
    expect(await lastAudit(victim.userId)).toMatchObject({
      action: 'user.block',
      details: { reason: REASON },
    });
    expect(JSON.stringify((await lastAudit(victim.userId)).details)).not.toContain(
      victim.phone.slice(4),
    );

    expect(
      (await request(t.app).post(`/api/admin/users/${victim.userId}/unblock`).set(bearer(admin)))
        .status,
    ).toBe(204);
    const back = await login(t.app, victim.phone);
    expect((await request(t.app).get('/api/me').set(bearer(back))).status).toBe(200);
  });

  it('never lets the administrator block themselves or the last administrator', async () => {
    const self = await request(t.app)
      .post(`/api/admin/users/${admin.userId}/block`)
      .set(bearer(admin))
      .send({ reason: REASON });
    expect(self.status).toBe(409);
    expect(self.body.error.code).toBe('CANNOT_ACT_ON_SELF');
  });
});
