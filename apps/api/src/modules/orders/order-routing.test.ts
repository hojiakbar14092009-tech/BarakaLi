import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { OrderDto } from '@barakali/shared';
import { seedSampleData } from '../../db/seed.js';
import {
  createTestApp,
  login,
  makeProduct,
  makeWorker,
  nextPhone,
  type Session,
  type TestApp,
} from '../../testing/helpers.js';

/** Phone of the first sample worker ("Dilfuza Karimova") from the seed data. */
const DILFUZA_PHONE = '+998900000001';
const CARD = { cardNumber: '4242 4242 4242 4242', expiry: '12/40', cvc: '123' };

let t: TestApp;
let hojiakbar: Awaited<ReturnType<typeof makeWorker>>;
let dilfuza: Session & { workerId: string };
let buyer: Session;

const bearer = (who: Session) => ({ Authorization: `Bearer ${who.token}` });

async function workerIdOf(userId: string): Promise<string> {
  const row = await t.db
    .selectFrom('workers')
    .select('id')
    .where('user_id', '=', userId)
    .executeTakeFirstOrThrow();
  return row.id;
}

async function placeAndPay(who: Session, items: { productId: string; quantity: number }[]) {
  const created = await request(t.app)
    .post('/api/orders')
    .set(bearer(who))
    .send({ items, fulfillment: 'pickup' });
  expect(created.status).toBe(201);
  const orders = created.body as OrderDto[];
  for (const order of orders) {
    await request(t.app).post(`/api/orders/${order.id}/payment`).set(bearer(who));
    const paid = await request(t.app)
      .post(`/api/orders/${order.id}/payment/confirm`)
      .set(bearer(who))
      .send(CARD);
    expect(paid.status).toBe(200);
  }
  return orders;
}

/** Owner of every product line must be the order's worker: this is what went wrong in production. */
async function assertLinesBelongTo(orderId: string, workerId: string): Promise<void> {
  const rows = await t.db
    .selectFrom('order_items as i')
    .innerJoin('products as p', 'p.id', 'i.product_id')
    .select(['p.worker_id'])
    .where('i.order_id', '=', orderId)
    .execute();
  expect(rows.length).toBeGreaterThan(0);
  for (const row of rows) expect(row.worker_id).toBe(workerId);
}

beforeAll(async () => {
  t = await createTestApp();
  // Real-world setup: sample workers (Dilfuza first) already exist before Hojiakbar signs up.
  await seedSampleData(t.db);
  const dilfuzaSession = await login(t.app, DILFUZA_PHONE, 'Dilfuza Karimova');
  dilfuza = { ...dilfuzaSession, workerId: await workerIdOf(dilfuzaSession.userId) };
  hojiakbar = await makeWorker(t, 'Hojiakbar');
  buyer = await login(t.app, nextPhone(), 'Xaridor');
});
afterAll(() => t.close());

describe('order reaches the worker who owns the product', () => {
  it('links the worker account to its own worker profile', async () => {
    const me = await request(t.app).get('/api/me').set(bearer(hojiakbar));
    expect(me.body.workerId).toBe(hojiakbar.workerId);
    expect(me.body.workerId).toBe(await workerIdOf(hojiakbar.userId));
    expect(hojiakbar.workerId).not.toBe(dilfuza.workerId);
  });

  it('keeps the public worker name equal to the profile name, so products show the right seller', async () => {
    const renamed = await request(t.app)
      .patch('/api/me')
      .set(bearer(hojiakbar))
      .send({ name: 'Hojiakbar Usta' });
    expect(renamed.status).toBe(200);
    expect(renamed.body).toMatchObject({ name: 'Hojiakbar Usta', workerName: 'Hojiakbar Usta' });
    const product = await makeProduct(t, hojiakbar, { stock: 3 });
    expect(product.worker.displayName).toBe('Hojiakbar Usta');
    // Dilfuza's profile is untouched by someone else's rename.
    const me = await request(t.app).get('/api/me').set(bearer(dilfuza));
    expect(me.body.workerName).toBe('Dilfuza Karimova');
  });

  it("stores Hojiakbar's product under Hojiakbar, not under the first sample worker", async () => {
    const product = await makeProduct(t, hojiakbar, { title: 'Hojiakbar sumkasi', stock: 5 });
    expect(product.worker.id).toBe(hojiakbar.workerId);
    const row = await t.db
      .selectFrom('products')
      .select('worker_id')
      .where('id', '=', product.id)
      .executeTakeFirstOrThrow();
    expect(row.worker_id).toBe(hojiakbar.workerId);
  });

  it("routes a buyer's order for Hojiakbar's product to Hojiakbar (reproduction)", async () => {
    const product = await makeProduct(t, hojiakbar, { title: 'Kashta sumka', stock: 5 });
    const [order] = await placeAndPay(buyer, [{ productId: product.id, quantity: 1 }]);
    expect(order).toBeDefined();

    const stored = await t.db
      .selectFrom('orders')
      .select('worker_id')
      .where('id', '=', order!.id)
      .executeTakeFirstOrThrow();
    expect(stored.worker_id).toBe(hojiakbar.workerId);
    await assertLinesBelongTo(order!.id, hojiakbar.workerId);

    const mine = await request(t.app).get('/api/orders?as=worker').set(bearer(hojiakbar));
    expect(mine.body.map((o: OrderDto) => o.id)).toContain(order!.id);
    const theirs = await request(t.app).get('/api/orders?as=worker').set(bearer(dilfuza));
    expect(theirs.body.map((o: OrderDto) => o.id)).not.toContain(order!.id);
    expect(mine.body[0].counterpart.name).toBe('Xaridor');
  });

  it('splits a mixed cart so each worker gets only their own lines', async () => {
    const ownProduct = await makeProduct(t, hojiakbar, { title: 'Koʻylak', stock: 5 });
    const dilfuzaProduct = await t.db
      .selectFrom('products')
      .select('id')
      .where('worker_id', '=', dilfuza.workerId)
      .where('status', '=', 'published')
      .executeTakeFirstOrThrow();
    const orders = await placeAndPay(buyer, [
      { productId: dilfuzaProduct.id, quantity: 1 },
      { productId: ownProduct.id, quantity: 2 },
    ]);
    expect(orders).toHaveLength(2);
    for (const order of orders) {
      const stored = await t.db
        .selectFrom('orders')
        .select('worker_id')
        .where('id', '=', order.id)
        .executeTakeFirstOrThrow();
      await assertLinesBelongTo(order.id, stored.worker_id);
    }
    const workerIds = new Set(orders.map((o) => o.items[0]?.productId));
    expect(workerIds.size).toBe(2);

    const mine = await request(t.app).get('/api/orders?as=worker').set(bearer(hojiakbar));
    const mineIds = mine.body.map((o: OrderDto) => o.id);
    const theirs = await request(t.app).get('/api/orders?as=worker').set(bearer(dilfuza));
    const theirIds = theirs.body.map((o: OrderDto) => o.id);
    const hojiOrder = orders.find((o) => o.items[0]?.productId === ownProduct.id)!;
    const dilfuzaOrder = orders.find((o) => o.items[0]?.productId === dilfuzaProduct.id)!;
    expect(mineIds).toContain(hojiOrder.id);
    expect(mineIds).not.toContain(dilfuzaOrder.id);
    expect(theirIds).toContain(dilfuzaOrder.id);
    expect(theirIds).not.toContain(hojiOrder.id);
  });

  it('refuses, at the database, a product line on an order addressed to another worker', async () => {
    const product = await makeProduct(t, hojiakbar, { stock: 5 });
    const wrong = await t.db
      .insertInto('orders')
      .values({
        type: 'product',
        customer_id: buyer.userId,
        worker_id: dilfuza.workerId,
        total: 100_000,
        commission_amount: 2_000,
        commission_rate: 0.02,
        worker_amount: 98_000,
        delivery_address: null,
        start_time: null,
        end_time: null,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    await expect(
      t.db
        .insertInto('order_items')
        .values({
          order_id: wrong.id,
          product_id: product.id,
          title_snapshot: product.title,
          unit_price: 100_000,
          quantity: 1,
          price_type: 'retail',
        })
        .execute(),
    ).rejects.toMatchObject({ constraint: 'order_items_owner_matches' });
    await t.db.deleteFrom('orders').where('id', '=', wrong.id).execute();
  });

  it('finds (but never changes) orders whose lines belong to another worker', async () => {
    const { findMismatchedOrders } = await import('../../db/audit.js');
    expect(await findMismatchedOrders(t.db)).toEqual([]);

    const product = await makeProduct(t, hojiakbar, { stock: 5 });
    const [order] = await placeAndPay(buyer, [{ productId: product.id, quantity: 1 }]);
    // Simulate a row written before the guard existed: the header points at the wrong worker.
    await t.db
      .updateTable('orders')
      .set({ worker_id: dilfuza.workerId })
      .where('id', '=', order!.id)
      .execute();
    const found = await findMismatchedOrders(t.db);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({
      orderId: order!.id,
      orderWorkerId: dilfuza.workerId,
      productWorkerIds: [hojiakbar.workerId],
    });
    for (const entry of found) expect(Object.keys(entry)).not.toContain('phone');
    // Put it back so later assertions in this file are not affected.
    await t.db
      .updateTable('orders')
      .set({ worker_id: hojiakbar.workerId })
      .where('id', '=', order!.id)
      .execute();
  });

  it('ignores any worker id the client tries to send with the cart', async () => {
    const product = await makeProduct(t, hojiakbar, { stock: 5 });
    const res = await request(t.app)
      .post('/api/orders')
      .set(bearer(buyer))
      .send({
        items: [{ productId: product.id, quantity: 1, workerId: dilfuza.workerId }],
        workerId: dilfuza.workerId,
        fulfillment: 'pickup',
      });
    expect(res.status).toBe(201);
    const stored = await t.db
      .selectFrom('orders')
      .select('worker_id')
      .where('id', '=', res.body[0].id)
      .executeTakeFirstOrThrow();
    expect(stored.worker_id).toBe(hojiakbar.workerId);
  });
});
