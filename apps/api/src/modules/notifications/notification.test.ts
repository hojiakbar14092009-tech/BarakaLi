import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NotificationsDto, OrderDto } from '@barakali/shared';
import { maskPhone } from '../../infra/sms.js';
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

const HOUR_MS = 60 * 60 * 1000;

let t: TestApp;
let worker: Awaited<ReturnType<typeof makeWorker>>;
let other: Awaited<ReturnType<typeof makeWorker>>;
let buyer: Session;

const bearer = (who: Session) => ({ Authorization: `Bearer ${who.token}` });
const inbox = async (who: Session): Promise<NotificationsDto> =>
  (await request(t.app).get('/api/my/notifications').set(bearer(who))).body as NotificationsDto;

beforeAll(async () => {
  t = await createTestApp();
  worker = await makeWorker(t, 'Usta');
  other = await makeWorker(t, 'Boshqa usta');
  buyer = await login(t.app, nextPhone(), 'Mijoz');
});
afterAll(() => t.close());

describe('new order notifications', () => {
  it('reaches the product owner when a product order is paid, and nobody else', async () => {
    const product = await makeProduct(t, worker, { stock: 5 });
    const created = await request(t.app)
      .post('/api/orders')
      .set(bearer(buyer))
      .send({ items: [{ productId: product.id, quantity: 1 }], fulfillment: 'pickup' });
    const orderId = (created.body as OrderDto[])[0]!.id;
    // Nothing before payment: an unpaid cart must not ping the worker.
    expect((await inbox(worker)).unread).toBe(0);

    await request(t.app).post(`/api/orders/${orderId}/payment`).set(bearer(buyer));
    await request(t.app)
      .post(`/api/orders/${orderId}/payment/confirm`)
      .set(bearer(buyer))
      .send({ cardNumber: '4242424242424242', expiry: '12/40', cvc: '123' });

    const mine = await inbox(worker);
    expect(mine.unread).toBe(1);
    expect(mine.items[0]).toMatchObject({ kind: 'order_new', orderId, readAt: null });
    expect((await inbox(other)).unread).toBe(0);
    expect((await inbox(buyer)).unread).toBe(0);
  });

  it('is written once even when the payment callback is repeated', async () => {
    const product = await makeProduct(t, worker, { stock: 5 });
    const before = (await inbox(worker)).items.length;
    const orderId = await placePaidOrder(t, buyer, product.id);
    await request(t.app)
      .post(`/api/orders/${orderId}/payment/confirm`)
      .set(bearer(buyer))
      .send({ cardNumber: '4242424242424242', expiry: '12/40', cvc: '123' });
    const after = await inbox(worker);
    expect(after.items.filter((n) => n.orderId === orderId)).toHaveLength(1);
    expect(after.items.length).toBe(before + 1);
  });

  it('reaches the worker for a free service request too', async () => {
    const start = new Date(Date.now() + 5 * 24 * HOUR_MS);
    start.setUTCHours(5, 0, 0, 0);
    await request(t.app)
      .post('/api/my/availability')
      .set(bearer(worker))
      .send({
        startTime: start.toISOString(),
        endTime: new Date(start.getTime() + 3 * HOUR_MS).toISOString(),
      });
    const res = await request(t.app).post('/api/orders/service').set(bearer(buyer)).send({
      workerId: worker.workerId,
      description: 'Koylak tikish',
      startTime: start.toISOString(),
      hours: 1,
    });
    expect(res.status).toBe(201);
    const mine = await inbox(worker);
    expect(mine.items.some((n) => n.orderId === res.body.id && n.readAt === null)).toBe(true);
  });

  it('is marked read when the worker opens the order, or all at once', async () => {
    const product = await makeProduct(t, worker, { stock: 5 });
    const orderId = await placePaidOrder(t, buyer, product.id);
    const unreadBefore = (await inbox(worker)).unread;
    expect(unreadBefore).toBeGreaterThan(0);

    const foreign = await request(t.app)
      .post(`/api/my/notifications/orders/${orderId}/read`)
      .set(bearer(other));
    expect(foreign.status).toBe(204);
    expect((await inbox(worker)).unread).toBe(unreadBefore);

    const read = await request(t.app)
      .post(`/api/my/notifications/orders/${orderId}/read`)
      .set(bearer(worker));
    expect(read.status).toBe(204);
    const after = await inbox(worker);
    expect(after.unread).toBe(unreadBefore - 1);
    expect(after.items.find((n) => n.orderId === orderId)?.readAt).not.toBeNull();

    await request(t.app).post('/api/my/notifications/read').set(bearer(worker));
    expect((await inbox(worker)).unread).toBe(0);
  });

  it('requires sign-in', async () => {
    expect((await request(t.app).get('/api/my/notifications')).status).toBe(401);
  });
});

describe('phone masking in logs', () => {
  it('keeps only the country code and the last two digits', () => {
    expect(maskPhone('+998901234567')).toBe('+998*******67');
    expect(maskPhone('901234567')).toBe('*******67');
    expect(maskPhone('+9')).toBe('+9');
    expect(maskPhone('+99812')).toBe('+998**');
  });
});
