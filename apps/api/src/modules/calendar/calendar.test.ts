import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AvailabilityDto, OrderDto } from '@barakali/shared';
import { buildContext } from '../../app.js';
import { loadConfig } from '../../config.js';
import {
  createTestApp,
  login,
  makeWorker,
  pngBuffer,
  type Session,
  type TestApp,
} from '../../testing/helpers.js';
import { refundUnacceptedOrders } from '../jobs/order-expiry.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

let t: TestApp;
let worker: Awaited<ReturnType<typeof makeWorker>>;
let customer: Session;
let otherCustomer: Session;

const bearer = (who: Session) => ({ Authorization: `Bearer ${who.token}` });

/** A whole-hour instant `days` from now, so slots are always in the future and never "past". */
function futureHour(days: number, hour: number): Date {
  const base = new Date(Date.now() + days * DAY_MS);
  base.setUTCHours(hour, 0, 0, 0);
  return base;
}

async function addWindow(who: Session, start: Date, hours: number) {
  return request(t.app)
    .post('/api/my/availability')
    .set(bearer(who))
    .send({
      startTime: start.toISOString(),
      endTime: new Date(start.getTime() + hours * HOUR_MS).toISOString(),
    });
}

async function bookService(who: Session, start: Date, hours = 1, extra: object = {}) {
  return request(t.app)
    .post('/api/orders/service')
    .set(bearer(who))
    .send({
      workerId: worker.workerId,
      description: 'Koylak tikib berish',
      startTime: start.toISOString(),
      hours,
      ...extra,
    });
}

beforeAll(async () => {
  t = await createTestApp();
  worker = await makeWorker(t, 'Tikuvchi');
  customer = await login(t.app, undefined, 'Mijoz');
  otherCustomer = await login(t.app, undefined, 'Boshqa mijoz');
});
afterAll(() => t.close());

describe('availability windows', () => {
  it('lets only a worker publish, list and remove windows', async () => {
    const start = futureHour(10, 5);
    expect((await addWindow(customer, start, 4)).status).toBe(403);
    const created = await addWindow(worker, start, 4);
    expect(created.status).toBe(201);

    const mine = await request(t.app).get('/api/my/availability').set(bearer(worker));
    expect(mine.body.windows).toHaveLength(1);
    expect(mine.body.hourlyRate).toBeUndefined();

    const publicView = await request(t.app).get(`/api/workers/${worker.workerId}/availability`);
    expect(publicView.status).toBe(200);
    expect((publicView.body as AvailabilityDto).windows).toHaveLength(1);

    const foreign = await request(t.app)
      .delete(`/api/my/availability/${created.body.id}`)
      .set(bearer(await makeWorker(t, 'Boshqa')));
    expect(foreign.status).toBe(404);
    const removed = await request(t.app)
      .delete(`/api/my/availability/${created.body.id}`)
      .set(bearer(worker));
    expect(removed.status).toBe(204);
  });

  it('rejects overlapping, past, reversed and overlong windows', async () => {
    const start = futureHour(11, 5);
    expect((await addWindow(worker, start, 4)).status).toBe(201);
    const overlap = await addWindow(worker, new Date(start.getTime() + 2 * HOUR_MS), 4);
    expect(overlap.status).toBe(409);
    expect(overlap.body.error.code).toBe('AVAILABILITY_OVERLAP');
    // Touching windows are fine.
    expect((await addWindow(worker, new Date(start.getTime() + 4 * HOUR_MS), 2)).status).toBe(201);

    const past = await addWindow(worker, new Date(Date.now() - HOUR_MS), 2);
    expect(past.body.error.code).toBe('AVAILABILITY_INVALID');
    const reversed = await request(t.app)
      .post('/api/my/availability')
      .set(bearer(worker))
      .send({
        startTime: futureHour(12, 9).toISOString(),
        endTime: futureHour(12, 7).toISOString(),
      });
    expect(reversed.body.error.code).toBe('AVAILABILITY_INVALID');
    const tooLong = await addWindow(worker, futureHour(13, 1), 17);
    expect(tooLong.body.error.code).toBe('AVAILABILITY_INVALID');
  });
});

describe('service orders and slot clashes', () => {
  it('creates a free request for the worker to accept and holds the slot', async () => {
    const start = futureHour(20, 5);
    await addWindow(worker, start, 6);
    const res = await bookService(customer, start, 3, { deadline: '2030-01-01' });
    expect(res.status).toBe(201);
    const order = res.body as OrderDto;
    expect(order).toMatchObject({
      type: 'service',
      status: 'new',
      total: 0,
      commission: 0,
      workerAmount: 0,
      paymentStatus: null,
      description: 'Koylak tikib berish',
      deadline: '2030-01-01',
      startTime: start.toISOString(),
      endTime: new Date(start.getTime() + 3 * HOUR_MS).toISOString(),
    });
    expect(order.items).toHaveLength(0);

    const view = await request(t.app).get(`/api/workers/${worker.workerId}/availability`);
    expect((view.body as AvailabilityDto).booked).toContainEqual({
      startTime: order.startTime,
      endTime: order.endTime,
    });
  });

  it('stops a second customer from taking an overlapping slot (database constraint)', async () => {
    const start = futureHour(21, 5);
    await addWindow(worker, start, 6);
    expect((await bookService(customer, start, 2)).status).toBe(201);
    const clash = await bookService(otherCustomer, new Date(start.getTime() + HOUR_MS), 2);
    expect(clash.status).toBe(409);
    expect(clash.body.error.code).toBe('ORDER_SLOT_TAKEN');
    // The hour right after the first booking is free.
    expect(
      (await bookService(otherCustomer, new Date(start.getTime() + 2 * HOUR_MS), 1)).status,
    ).toBe(201);
  });

  it('lets exactly one of two simultaneous bookings win', async () => {
    const start = futureHour(22, 5);
    await addWindow(worker, start, 3);
    const results = await Promise.all([
      bookService(customer, start, 2),
      bookService(otherCustomer, start, 2),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  });

  it('enforces the same rule directly in the database', async () => {
    const start = futureHour(23, 5);
    const base = {
      type: 'service' as const,
      customer_id: customer.userId,
      worker_id: worker.workerId,
      total: 40_000,
      commission_amount: 800,
      commission_rate: 0.02,
      worker_amount: 39_200,
      delivery_address: null,
      start_time: start,
      end_time: new Date(start.getTime() + HOUR_MS),
    };
    await t.db.insertInto('orders').values(base).execute();
    await expect(t.db.insertInto('orders').values(base).execute()).rejects.toMatchObject({
      code: '23P01',
    });
    // A cancelled order no longer holds the slot.
    await t.db
      .updateTable('orders')
      .set({ status: 'cancelled' })
      .where('worker_id', '=', worker.workerId)
      .where('start_time', '=', start)
      .execute();
    await expect(t.db.insertInto('orders').values(base).execute()).resolves.toBeDefined();
  });

  it('refuses slots outside the published windows, in the past, or or for own services', async () => {
    const start = futureHour(25, 5);
    await addWindow(worker, start, 2);
    const outside = await bookService(customer, new Date(start.getTime() + HOUR_MS), 2);
    expect(outside.body.error.code).toBe('SLOT_OUTSIDE_AVAILABILITY');
    const past = await bookService(customer, new Date(Date.now() - HOUR_MS), 1);
    expect(past.body.error.code).toBe('SLOT_IN_PAST');
    const own = await request(t.app).post('/api/orders/service').set(bearer(worker)).send({
      workerId: worker.workerId,
      description: 'Oʻzimga',
      startTime: start.toISOString(),
      hours: 1,
    });
    expect(own.body.error.code).toBe('OWN_SERVICE');
  });

  it('requires sign-in and validates the body', async () => {
    const anon = await request(t.app).post('/api/orders/service').send({});
    expect(anon.status).toBe(401);
    const bad = await bookService(customer, futureHour(26, 5), 99);
    expect(bad.status).toBe(400);
  });
});

describe('reference photos', () => {
  it('attaches uploaded photos and rejects foreign URLs and more than five', async () => {
    const start = futureHour(30, 5);
    await addWindow(worker, start, 8);
    const upload = await request(t.app)
      .post('/api/uploads/order-image')
      .set(bearer(customer))
      .attach('image', await pngBuffer(), { filename: 'a.png', contentType: 'image/png' });
    expect(upload.status).toBe(201);
    const url = upload.body.url as string;
    expect(url.endsWith('.webp')).toBe(true);

    const ok = await bookService(customer, start, 1, { imageUrls: [url] });
    expect(ok.status).toBe(201);
    expect((ok.body as OrderDto).images).toEqual([url]);

    const foreign = await bookService(customer, new Date(start.getTime() + 2 * HOUR_MS), 1, {
      imageUrls: ['https://example.com/a.png'],
    });
    expect(foreign.body.error.code).toBe('ORDER_IMAGE_INVALID');
    const missing = await bookService(customer, new Date(start.getTime() + 2 * HOUR_MS), 1, {
      imageUrls: ['/api/files/does-not-exist.webp'],
    });
    expect(missing.body.error.code).toBe('ORDER_IMAGE_INVALID');
    const six = await bookService(customer, new Date(start.getTime() + 2 * HOUR_MS), 1, {
      imageUrls: Array.from({ length: 6 }, () => url),
    });
    expect(six.status).toBe(400);

    const noFile = await request(t.app).post('/api/uploads/order-image').set(bearer(customer));
    expect(noFile.body.error.code).toBe('UPLOAD_MISSING_FILE');
  });
});

describe('free service requests: no payment, worker answer and 24 hour expiry', () => {
  const config = loadConfig({ NODE_ENV: 'test' });
  const act = (id: string, action: string) =>
    request(t.app).post(`/api/orders/${id}/actions`).set(bearer(worker)).send({ action });

  it('takes no money: there is nothing to pay and no earnings are recorded', async () => {
    const start = futureHour(35, 5);
    await addWindow(worker, start, 4);
    const order = (await bookService(customer, start, 2)).body as OrderDto;
    expect(order.status).toBe('new');

    const payment = await request(t.app)
      .post(`/api/orders/${order.id}/payment`)
      .set(bearer(customer));
    expect(payment.status).toBe(409);
    expect(payment.body.error.code).toBe('ORDER_NOT_PAYABLE');
    const rows = await t.db
      .selectFrom('payments')
      .select('id')
      .where('order_id', '=', order.id)
      .execute();
    expect(rows).toHaveLength(0);

    for (const action of ['accept', 'start', 'ready', 'deliver']) {
      expect((await act(order.id, action)).status).toBe(200);
    }
    const earnings = await t.db
      .selectFrom('earnings')
      .select('id')
      .where('order_id', '=', order.id)
      .execute();
    expect(earnings).toHaveLength(0);
    const delivered = await request(t.app).get(`/api/orders/${order.id}`).set(bearer(customer));
    expect(delivered.body).toMatchObject({ status: 'delivered', total: 0, paymentStatus: null });
  });

  it('shows the customer the worker phone only after the worker accepts', async () => {
    const start = futureHour(37, 5);
    await addWindow(worker, start, 2);
    const order = (await bookService(customer, start, 1)).body as OrderDto;
    const before = await request(t.app).get(`/api/orders/${order.id}`).set(bearer(customer));
    expect(before.body.counterpart.phone).toBeNull();
    await act(order.id, 'accept');
    const after = await request(t.app).get(`/api/orders/${order.id}`).set(bearer(customer));
    expect(after.body.counterpart.phone).toBe(worker.phone);
  });

  it('cancels (not refunds) a rejected request and frees the slot', async () => {
    const start = futureHour(36, 5);
    await addWindow(worker, start, 2);
    const order = (await bookService(customer, start, 1)).body as OrderDto;
    const rejected = await act(order.id, 'reject');
    expect(rejected.status).toBe(200);
    expect(rejected.body.status).toBe('cancelled');
    expect((await bookService(otherCustomer, start, 1)).status).toBe(201);
  });

  it('cancels a request the worker ignored for 24 hours, but not before', async () => {
    const start = futureHour(40, 5);
    await addWindow(worker, start, 2);
    const order = (await bookService(customer, start, 1)).body as OrderDto;
    const ctx = buildContext({ db: t.db, config });

    expect(await refundUnacceptedOrders(ctx, new Date(Date.now() + 23 * HOUR_MS))).toBe(0);
    expect(
      await refundUnacceptedOrders(ctx, new Date(Date.now() + 25 * HOUR_MS)),
    ).toBeGreaterThanOrEqual(1);

    const row = await t.db
      .selectFrom('orders')
      .select('status')
      .where('id', '=', order.id)
      .executeTakeFirstOrThrow();
    expect(row.status).toBe('cancelled');
    // Running again changes nothing, and the slot is free once more.
    expect(await refundUnacceptedOrders(ctx, new Date(Date.now() + 26 * HOUR_MS))).toBe(0);
    expect((await bookService(otherCustomer, start, 1)).status).toBe(201);
  });

  it('does not cancel a request the worker already accepted', async () => {
    const start = futureHour(41, 5);
    await addWindow(worker, start, 2);
    const order = (await bookService(customer, start, 1)).body as OrderDto;
    await act(order.id, 'accept');
    const ctx = buildContext({ db: t.db, config });
    await refundUnacceptedOrders(ctx, new Date(Date.now() + 48 * HOUR_MS));
    const row = await t.db
      .selectFrom('orders')
      .select('status')
      .where('id', '=', order.id)
      .executeTakeFirstOrThrow();
    expect(row.status).toBe('accepted');
  });

  it('keeps a worker from rejecting a request that is already in progress', async () => {
    const start = futureHour(42, 5);
    await addWindow(worker, start, 2);
    const order = (await bookService(customer, start, 1)).body as OrderDto;
    await act(order.id, 'accept');
    expect((await act(order.id, 'reject')).status).toBe(409);
  });
});
