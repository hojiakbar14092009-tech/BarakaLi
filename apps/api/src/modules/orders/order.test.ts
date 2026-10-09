import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { OrderDto, ProductDto } from '@barakali/shared';
import {
  createTestApp,
  login,
  makeProduct,
  makeWorker,
  type Session,
  type TestApp,
} from '../../testing/helpers.js';
import { startOfTashkentMonth } from './order.service.js';

const CARD = { cardNumber: '4242 4242 4242 4242', expiry: '12/40', cvc: '123' };

let t: TestApp;
let seller: Awaited<ReturnType<typeof makeWorker>>;
let rival: Awaited<ReturnType<typeof makeWorker>>;
let buyer: Session;

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  t = await createTestApp();
  seller = await makeWorker(t, 'Sotuvchi');
  rival = await makeWorker(t, 'Raqib');
  buyer = await login(t.app, undefined, 'Haridor');
});
afterAll(() => t.close());

async function placeOrder(who: Session, items: { productId: string; quantity: number }[]) {
  return request(t.app)
    .post('/api/orders')
    .set(bearer(who.token))
    .send({ items, fulfillment: 'pickup' });
}

async function pay(who: Session, orderId: string, card = CARD) {
  await request(t.app).post(`/api/orders/${orderId}/payment`).set(bearer(who.token));
  return request(t.app)
    .post(`/api/orders/${orderId}/payment/confirm`)
    .set(bearer(who.token))
    .send(card);
}

async function stockOf(product: ProductDto): Promise<number> {
  const row = await t.db
    .selectFrom('products')
    .select('stock')
    .where('id', '=', product.id)
    .executeTakeFirstOrThrow();
  return row.stock;
}

async function paidOrder(
  product: ProductDto,
  quantity = 1,
  who: Session = buyer,
): Promise<OrderDto> {
  const created = await placeOrder(who, [{ productId: product.id, quantity }]);
  const orderId = (created.body as OrderDto[])[0]!.id;
  return (await pay(who, orderId)).body as OrderDto;
}

const act = (who: Session, id: string, action: string) =>
  request(t.app).post(`/api/orders/${id}/actions`).set(bearer(who.token)).send({ action });

describe('server-side pricing', () => {
  it('uses retail below the wholesale threshold and wholesale from it', async () => {
    const product = await makeProduct(t, seller, {
      retailPrice: 10_000,
      wholesalePrice: 8_000,
      wholesaleMinQty: 10,
      stock: 100,
    });
    const retail = await placeOrder(buyer, [{ productId: product.id, quantity: 9 }]);
    expect(retail.status).toBe(201);
    expect(retail.body[0]).toMatchObject({
      total: 90_000,
      items: [{ priceType: 'retail', unitPrice: 10_000 }],
    });
    const wholesale = await placeOrder(buyer, [{ productId: product.id, quantity: 10 }]);
    expect(wholesale.body[0]).toMatchObject({
      total: 80_000,
      items: [{ priceType: 'wholesale', unitPrice: 8_000 }],
    });
  });

  it('ignores any price the client tries to send', async () => {
    const product = await makeProduct(t, seller, { retailPrice: 50_000, stock: 5 });
    const res = await request(t.app)
      .post('/api/orders')
      .set(bearer(buyer.token))
      .send({
        items: [{ productId: product.id, quantity: 1, unitPrice: 1, price: 1 }],
        fulfillment: 'pickup',
        total: 1,
      });
    expect(res.body[0].total).toBe(50_000);
  });

  it('computes the 5% commission with whole-som rounding', async () => {
    const product = await makeProduct(t, seller, { retailPrice: 1_230, stock: 10 });
    const res = await placeOrder(buyer, [{ productId: product.id, quantity: 1 }]);
    expect(res.body[0]).toMatchObject({ total: 1_230, commission: 62, workerAmount: 1_168 });
  });

  it('merges duplicate cart lines before choosing the price tier', async () => {
    const product = await makeProduct(t, seller, {
      retailPrice: 1_000,
      wholesalePrice: 700,
      wholesaleMinQty: 6,
      stock: 50,
    });
    const res = await placeOrder(buyer, [
      { productId: product.id, quantity: 3 },
      { productId: product.id, quantity: 3 },
    ]);
    expect(res.body[0].items).toHaveLength(1);
    expect(res.body[0].total).toBe(4_200);
  });
});

describe('order creation rules', () => {
  it('splits a cart into one order per worker', async () => {
    const a = await makeProduct(t, seller, { stock: 5 });
    const b = await makeProduct(t, rival, { stock: 5 });
    const res = await placeOrder(buyer, [
      { productId: a.id, quantity: 1 },
      { productId: b.id, quantity: 1 },
    ]);
    expect(res.status).toBe(201);
    expect(res.body).toHaveLength(2);
  });

  it('rejects own products, drafts, unknown products and too large quantities', async () => {
    const mine = await makeProduct(t, seller, { stock: 5 });
    expect((await placeOrder(seller, [{ productId: mine.id, quantity: 1 }])).body.error.code).toBe(
      'OWN_PRODUCT',
    );
    const draft = await makeProduct(t, seller, { publish: false });
    expect((await placeOrder(buyer, [{ productId: draft.id, quantity: 1 }])).body.error.code).toBe(
      'PRODUCT_UNAVAILABLE',
    );
    const missing = '00000000-0000-4000-8000-000000000000';
    expect((await placeOrder(buyer, [{ productId: missing, quantity: 1 }])).status).toBe(404);
    const scarce = await makeProduct(t, seller, { stock: 2 });
    const over = await placeOrder(buyer, [{ productId: scarce.id, quantity: 3 }]);
    expect(over.status).toBe(409);
    expect(over.body.error.code).toBe('INSUFFICIENT_STOCK');
  });

  it('requires a delivery address for delivery and requires login', async () => {
    const product = await makeProduct(t, seller, { stock: 5 });
    const noAddress = await request(t.app)
      .post('/api/orders')
      .set(bearer(buyer.token))
      .send({ items: [{ productId: product.id, quantity: 1 }], fulfillment: 'delivery' });
    expect(noAddress.status).toBe(400);
    const anonymous = await request(t.app)
      .post('/api/orders')
      .send({ items: [{ productId: product.id, quantity: 1 }], fulfillment: 'pickup' });
    expect(anonymous.status).toBe(401);
  });
});

describe('payment', () => {
  it('keeps stock untouched until the payment succeeds, then reserves it once', async () => {
    const product = await makeProduct(t, seller, { stock: 10 });
    const created = await placeOrder(buyer, [{ productId: product.id, quantity: 4 }]);
    const orderId = created.body[0].id as string;
    expect(created.body[0].status).toBe('awaiting_payment');
    expect(await stockOf(product)).toBe(10);

    const declined = await pay(buyer, orderId, { ...CARD, cardNumber: '4242 4242 4242 4241' });
    expect(declined.status).toBe(402);
    expect(declined.body.error.code).toBe('PAYMENT_DECLINED');
    expect(await stockOf(product)).toBe(10);

    const paid = await pay(buyer, orderId);
    expect(paid.status).toBe(200);
    expect(paid.body).toMatchObject({ status: 'new', paymentStatus: 'paid' });
    expect(await stockOf(product)).toBe(6);
  });

  it('is idempotent: a repeated confirmation never reserves stock twice', async () => {
    const product = await makeProduct(t, seller, { stock: 10 });
    const created = await placeOrder(buyer, [{ productId: product.id, quantity: 3 }]);
    const orderId = created.body[0].id as string;
    await pay(buyer, orderId);
    const again = await request(t.app)
      .post(`/api/orders/${orderId}/payment/confirm`)
      .set(bearer(buyer.token))
      .send(CARD);
    expect(again.status).toBe(200);
    expect(await stockOf(product)).toBe(7);
    const payments = await t.db
      .selectFrom('payments')
      .select('id')
      .where('order_id', '=', orderId)
      .execute();
    expect(payments).toHaveLength(1);
    const restart = await request(t.app)
      .post(`/api/orders/${orderId}/payment`)
      .set(bearer(buyer.token));
    expect(restart.status).toBe(409);
    expect(restart.body.error.code).toBe('PAYMENT_ALREADY_PAID');
  });

  it('never sells the last item twice when two buyers pay at the same time', async () => {
    const product = await makeProduct(t, seller, { stock: 1 });
    const other = await login(t.app);
    const first = await placeOrder(buyer, [{ productId: product.id, quantity: 1 }]);
    const second = await placeOrder(other, [{ productId: product.id, quantity: 1 }]);
    const results = await Promise.all([
      pay(buyer, first.body[0].id as string),
      pay(other, second.body[0].id as string),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await stockOf(product)).toBe(0);
  });

  it('only lets the customer pay their own order', async () => {
    const product = await makeProduct(t, seller, { stock: 3 });
    const created = await placeOrder(buyer, [{ productId: product.id, quantity: 1 }]);
    const stranger = await login(t.app);
    const res = await pay(stranger, created.body[0].id as string);
    expect(res.status).toBe(404);
  });

  it('never stores card data', async () => {
    const product = await makeProduct(t, seller, { stock: 3 });
    const order = await paidOrder(product);
    const rows = JSON.stringify(
      await t.db.selectFrom('payments').selectAll().where('order_id', '=', order.id).execute(),
    );
    expect(rows).not.toContain('4242');
    expect(rows).not.toContain('123');
  });
});

describe('fulfilment flow and earnings', () => {
  it('walks new → accepted → in_progress → ready → delivered and records earnings once', async () => {
    const product = await makeProduct(t, seller, { retailPrice: 100_000, stock: 5 });
    const order = await paidOrder(product, 2);
    expect(order).toMatchObject({ total: 200_000, commission: 10_000, workerAmount: 190_000 });
    for (const [action, status] of [
      ['accept', 'accepted'],
      ['start', 'in_progress'],
      ['ready', 'ready'],
      ['deliver', 'delivered'],
    ] as const) {
      const res = await act(seller, order.id, action);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(status);
    }
    const earnings = await request(t.app).get('/api/earnings').set(bearer(seller.token));
    const entry = earnings.body.history.find((h: { orderId: string }) => h.orderId === order.id);
    expect(entry).toMatchObject({ amount: 190_000, commission: 10_000 });
    expect(earnings.body.monthTotal).toBeGreaterThanOrEqual(190_000);
    const repeat = await act(seller, order.id, 'deliver');
    expect(repeat.status).toBe(409);
    expect(repeat.body.error.code).toBe('ORDER_INVALID_TRANSITION');
    const rows = await t.db
      .selectFrom('earnings')
      .select('id')
      .where('order_id', '=', order.id)
      .execute();
    expect(rows).toHaveLength(1);
  });

  it('rejects transitions outside the allowed table', async () => {
    const product = await makeProduct(t, seller, { stock: 5 });
    const order = await paidOrder(product);
    for (const action of ['start', 'ready', 'deliver']) {
      const res = await act(seller, order.id, action);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ORDER_INVALID_TRANSITION');
    }
    await act(seller, order.id, 'accept');
    expect((await act(seller, order.id, 'reject')).status).toBe(409);
  });

  it('refunds a rejected order, restores stock and writes no earnings', async () => {
    const product = await makeProduct(t, seller, { stock: 5 });
    const order = await paidOrder(product, 2);
    expect(await stockOf(product)).toBe(3);
    const res = await act(seller, order.id, 'reject');
    expect(res.body).toMatchObject({ status: 'refunded', paymentStatus: 'refunded' });
    expect(await stockOf(product)).toBe(5);
    const rows = await t.db
      .selectFrom('earnings')
      .select('id')
      .where('order_id', '=', order.id)
      .execute();
    expect(rows).toHaveLength(0);
  });

  it('lets only the owning worker act on an order', async () => {
    const product = await makeProduct(t, seller, { stock: 5 });
    const order = await paidOrder(product);
    expect((await act(rival, order.id, 'accept')).status).toBe(403);
    expect((await act(buyer, order.id, 'accept')).status).toBe(403);
  });
});

describe('visibility', () => {
  it('shows the counterpart phone only after the order is accepted', async () => {
    const product = await makeProduct(t, seller, { stock: 5 });
    const order = await paidOrder(product);
    const before = await request(t.app).get(`/api/orders/${order.id}`).set(bearer(buyer.token));
    expect(before.body.counterpart.phone).toBeNull();
    expect(JSON.stringify(before.body)).not.toContain(seller.phone);
    await act(seller, order.id, 'accept');
    const after = await request(t.app).get(`/api/orders/${order.id}`).set(bearer(buyer.token));
    expect(after.body.counterpart.phone).toBe(seller.phone);
    const forWorker = await request(t.app).get(`/api/orders/${order.id}`).set(bearer(seller.token));
    expect(forWorker.body.counterpart.phone).toBe(buyer.phone);
  });

  it("prevents reading or listing other people's orders", async () => {
    const product = await makeProduct(t, seller, { stock: 5 });
    const order = await paidOrder(product);
    const stranger = await login(t.app);
    expect(
      (await request(t.app).get(`/api/orders/${order.id}`).set(bearer(stranger.token))).status,
    ).toBe(404);
    const list = await request(t.app).get('/api/orders').set(bearer(stranger.token));
    expect(list.body).toEqual([]);
    const rivalList = await request(t.app).get('/api/orders?as=worker').set(bearer(rival.token));
    expect(rivalList.body.map((o: OrderDto) => o.id)).not.toContain(order.id);
  });

  it('keeps unpaid orders out of the worker queue', async () => {
    const product = await makeProduct(t, seller, { stock: 5 });
    const created = await placeOrder(buyer, [{ productId: product.id, quantity: 1 }]);
    const queue = await request(t.app).get('/api/orders?as=worker').set(bearer(seller.token));
    expect(queue.body.map((o: OrderDto) => o.id)).not.toContain(created.body[0].id);
  });
});

describe('startOfTashkentMonth', () => {
  it('uses the Asia/Tashkent calendar month', () => {
    expect(startOfTashkentMonth(new Date('2026-09-30T20:00:00Z')).toISOString()).toBe(
      '2026-09-30T19:00:00.000Z',
    );
    expect(startOfTashkentMonth(new Date('2026-10-15T10:00:00Z')).toISOString()).toBe(
      '2026-09-30T19:00:00.000Z',
    );
    expect(startOfTashkentMonth(new Date('2026-10-31T19:30:00Z')).toISOString()).toBe(
      '2026-10-31T19:00:00.000Z',
    );
  });
});
