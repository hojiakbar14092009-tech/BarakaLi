import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { MaterialDto, MaterialOrderDto } from '@barakali/shared';
import { buildContext } from '../../app.js';
import { loadConfig } from '../../config.js';
import {
  createTestApp,
  login,
  makeWorker,
  nextPhone,
  type Session,
  type TestApp,
} from '../../testing/helpers.js';
import { expireUnpaidMaterialOrders } from '../jobs/order-expiry.js';

const ADMIN_PHONE = '+998907778899';
const CARD = { cardNumber: '4242 4242 4242 4242', expiry: '12/40', cvc: '123' };

let t: TestApp;
let admin: Session;
let worker: Awaited<ReturnType<typeof makeWorker>>;
let otherWorker: Awaited<ReturnType<typeof makeWorker>>;
let customer: Session;

const bearer = (who: Session) => ({ Authorization: `Bearer ${who.token}` });

async function createMaterial(body: Record<string, unknown>): Promise<MaterialDto> {
  const res = await request(t.app).post('/api/admin/materials').set(bearer(admin)).send(body);
  expect(res.status).toBe(201);
  return res.body as MaterialDto;
}

async function order(who: Session, items: { materialId: string; quantity: number }[]) {
  return request(t.app).post('/api/material-orders').set(bearer(who)).send({ items });
}

async function pay(who: Session, orderId: string, card = CARD) {
  await request(t.app).post(`/api/material-orders/${orderId}/payment`).set(bearer(who));
  return request(t.app)
    .post(`/api/material-orders/${orderId}/payment/confirm`)
    .set(bearer(who))
    .send(card);
}

beforeAll(async () => {
  t = await createTestApp({ ADMIN_PHONES: ADMIN_PHONE });
  admin = await login(t.app, ADMIN_PHONE, 'Admin');
  worker = await makeWorker(t, 'Tikuvchi');
  otherWorker = await makeWorker(t, 'Boshqa');
  customer = await login(t.app, nextPhone(), 'Mijoz');
});
afterAll(() => t.close());

describe('materials catalog', () => {
  it('is managed by admins and visible only to workers, with the discount applied', async () => {
    const material = await createMaterial({
      name: 'Paxta ip',
      price: 10_000,
      discountPercent: 15,
      stock: 50,
    });
    expect(material.unitPrice).toBe(8_500);

    expect((await request(t.app).get('/api/materials')).status).toBe(401);
    expect((await request(t.app).get('/api/materials').set(bearer(customer))).status).toBe(403);
    const list = await request(t.app).get('/api/materials').set(bearer(worker));
    expect(list.body.find((m: MaterialDto) => m.id === material.id)).toMatchObject({
      unitPrice: 8_500,
      discountPercent: 15,
    });

    const forbidden = await request(t.app)
      .post('/api/admin/materials')
      .set(bearer(worker))
      .send({ name: 'Yangi', price: 1_000, stock: 1 });
    expect(forbidden.status).toBe(403);
  });

  it('validates input and hides inactive items from workers', async () => {
    const bad = await request(t.app)
      .post('/api/admin/materials')
      .set(bearer(admin))
      .send({ name: 'Narxsiz', price: -5, stock: 1 });
    expect(bad.status).toBe(400);
    const tooMuch = await request(t.app)
      .post('/api/admin/materials')
      .set(bearer(admin))
      .send({ name: 'Chegirma', price: 1_000, stock: 1, discountPercent: 95 });
    expect(tooMuch.status).toBe(400);

    const hidden = await createMaterial({ name: 'Yashirin', price: 2_000, stock: 5 });
    await request(t.app)
      .put(`/api/admin/materials/${hidden.id}`)
      .set(bearer(admin))
      .send({ name: 'Yashirin', price: 2_000, stock: 5, isActive: false });
    const list = await request(t.app).get('/api/materials').set(bearer(worker));
    expect(list.body.some((m: MaterialDto) => m.id === hidden.id)).toBe(false);
    const attempt = await order(worker, [{ materialId: hidden.id, quantity: 1 }]);
    expect(attempt.body.error.code).toBe('MATERIAL_UNAVAILABLE');
  });
});

describe('material orders and payment', () => {
  it('prices on the server, takes no commission and reserves stock when paid', async () => {
    const material = await createMaterial({
      name: 'Atlas mato',
      price: 45_000,
      discountPercent: 10,
      stock: 10,
    });
    const created = await order(worker, [
      { materialId: material.id, quantity: 2 },
      { materialId: material.id, quantity: 1 },
    ]);
    expect(created.status).toBe(201);
    const body = created.body as MaterialOrderDto;
    expect(body.status).toBe('awaiting_payment');
    expect(body.items).toHaveLength(1);
    expect(body.total).toBe(3 * 40_500);

    const stockBefore = await t.db
      .selectFrom('materials')
      .select('stock')
      .where('id', '=', material.id)
      .executeTakeFirstOrThrow();
    expect(stockBefore.stock).toBe(10);

    const paid = await pay(worker, body.id);
    expect(paid.status).toBe(200);
    expect(paid.body.status).toBe('paid');
    const stockAfter = await t.db
      .selectFrom('materials')
      .select('stock')
      .where('id', '=', material.id)
      .executeTakeFirstOrThrow();
    expect(stockAfter.stock).toBe(7);

    // Confirming again is harmless and does not reserve a second time.
    const repeat = await pay(worker, body.id);
    expect(repeat.status).toBe(200);
    const stockRepeat = await t.db
      .selectFrom('materials')
      .select('stock')
      .where('id', '=', material.id)
      .executeTakeFirstOrThrow();
    expect(stockRepeat.stock).toBe(7);
  });

  it('refuses quantities above stock and orders of another worker', async () => {
    const material = await createMaterial({ name: 'Un', price: 38_000, stock: 2 });
    const tooMany = await order(worker, [{ materialId: material.id, quantity: 3 }]);
    expect(tooMany.status).toBe(409);
    expect(tooMany.body.error.code).toBe('INSUFFICIENT_STOCK');

    const mine = await order(worker, [{ materialId: material.id, quantity: 1 }]);
    const foreign = await request(t.app)
      .get(`/api/material-orders/${mine.body.id}`)
      .set(bearer(otherWorker));
    expect(foreign.status).toBe(404);
    const foreignPay = await pay(otherWorker, mine.body.id);
    expect(foreignPay.status).toBe(404);
  });

  it('never oversells the last unit to two workers paying together', async () => {
    const material = await createMaterial({ name: 'Oxirgi ip', price: 5_000, stock: 1 });
    const first = await order(worker, [{ materialId: material.id, quantity: 1 }]);
    const second = await order(otherWorker, [{ materialId: material.id, quantity: 1 }]);
    await request(t.app).post(`/api/material-orders/${first.body.id}/payment`).set(bearer(worker));
    await request(t.app)
      .post(`/api/material-orders/${second.body.id}/payment`)
      .set(bearer(otherWorker));
    const results = await Promise.all([
      request(t.app)
        .post(`/api/material-orders/${first.body.id}/payment/confirm`)
        .set(bearer(worker))
        .send(CARD),
      request(t.app)
        .post(`/api/material-orders/${second.body.id}/payment/confirm`)
        .set(bearer(otherWorker))
        .send(CARD),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const row = await t.db
      .selectFrom('materials')
      .select('stock')
      .where('id', '=', material.id)
      .executeTakeFirstOrThrow();
    expect(row.stock).toBe(0);
  });

  it('declines an invalid card without reserving anything', async () => {
    const material = await createMaterial({ name: 'Igna', price: 9_000, stock: 5 });
    const created = await order(worker, [{ materialId: material.id, quantity: 2 }]);
    const declined = await pay(worker, created.body.id, {
      ...CARD,
      cardNumber: '4242 4242 4242 4241',
    });
    expect(declined.status).toBe(402);
    const row = await t.db
      .selectFrom('materials')
      .select('stock')
      .where('id', '=', material.id)
      .executeTakeFirstOrThrow();
    expect(row.stock).toBe(5);
  });

  it('cancels an unpaid order after 15 minutes', async () => {
    const material = await createMaterial({ name: 'Tugma', price: 1_000, stock: 5 });
    const created = await order(worker, [{ materialId: material.id, quantity: 1 }]);
    const ctx = buildContext({ db: t.db, config: loadConfig({ NODE_ENV: 'test' }) });
    expect(await expireUnpaidMaterialOrders(ctx.db, new Date(Date.now() + 5 * 60 * 1000))).toBe(0);
    expect(
      await expireUnpaidMaterialOrders(ctx.db, new Date(Date.now() + 16 * 60 * 1000)),
    ).toBeGreaterThanOrEqual(1);
    const row = await request(t.app)
      .get(`/api/material-orders/${created.body.id}`)
      .set(bearer(worker));
    expect(row.body.status).toBe('cancelled');
    const late = await pay(worker, created.body.id);
    expect(late.status).toBe(409);
  });

  it('lets the admin mark a paid order delivered, once', async () => {
    const material = await createMaterial({ name: 'Boʻyoq', price: 7_000, stock: 5 });
    const created = await order(worker, [{ materialId: material.id, quantity: 1 }]);
    await pay(worker, created.body.id);
    const list = await request(t.app).get('/api/admin/material-orders').set(bearer(admin));
    expect(list.body.some((o: { id: string }) => o.id === created.body.id)).toBe(true);
    const first = await request(t.app)
      .post(`/api/admin/material-orders/${created.body.id}/deliver`)
      .set(bearer(admin));
    expect(first.status).toBe(204);
    const second = await request(t.app)
      .post(`/api/admin/material-orders/${created.body.id}/deliver`)
      .set(bearer(admin));
    expect(second.status).toBe(409);
  });
});

describe('savings goal', () => {
  it('stores one goal per worker and tracks earnings since it was set', async () => {
    const empty = await request(t.app).get('/api/my/savings-goal').set(bearer(worker));
    expect(empty.body.goal).toBeNull();

    const set = await request(t.app)
      .put('/api/my/savings-goal')
      .set(bearer(worker))
      .send({ targetAmount: 1_000_000 });
    expect(set.body.goal).toMatchObject({ targetAmount: 1_000_000, saved: 0 });

    const goalRow = await t.db
      .selectFrom('savings_goals')
      .select('created_at')
      .where('worker_id', '=', worker.workerId)
      .executeTakeFirstOrThrow();
    const orderRow = await t.db
      .insertInto('orders')
      .values({
        type: 'product',
        customer_id: customer.userId,
        worker_id: worker.workerId,
        total: 200_000,
        commission_amount: 4_000,
        commission_rate: 0.02,
        worker_amount: 196_000,
        delivery_address: null,
        start_time: null,
        end_time: null,
        status: 'delivered',
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    await t.db
      .insertInto('earnings')
      .values({
        order_id: orderRow.id,
        worker_id: worker.workerId,
        amount: 196_000,
        commission: 4_000,
        created_at: new Date(goalRow.created_at.getTime() + 1_000),
      })
      .execute();

    const updated = await request(t.app)
      .put('/api/my/savings-goal')
      .set(bearer(worker))
      .send({ targetAmount: 2_000_000 });
    expect(updated.body.goal).toMatchObject({ targetAmount: 2_000_000, saved: 196_000 });
    expect(updated.body.goal.createdAt).toBe(goalRow.created_at.toISOString());

    const rows = await t.db
      .selectFrom('savings_goals')
      .select('id')
      .where('worker_id', '=', worker.workerId)
      .execute();
    expect(rows).toHaveLength(1);

    const otherView = await request(t.app).get('/api/my/savings-goal').set(bearer(otherWorker));
    expect(otherView.body.goal).toBeNull();
    expect((await request(t.app).delete('/api/my/savings-goal').set(bearer(worker))).status).toBe(
      204,
    );
  });

  it('rejects a non-positive target and non-workers', async () => {
    const bad = await request(t.app)
      .put('/api/my/savings-goal')
      .set(bearer(worker))
      .send({ targetAmount: 0 });
    expect(bad.status).toBe(400);
    const notWorker = await request(t.app).get('/api/my/savings-goal').set(bearer(customer));
    expect(notWorker.status).toBe(403);
  });
});
