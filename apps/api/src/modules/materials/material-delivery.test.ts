import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AdminMaterialOrderDto, MaterialOrderDto, NotificationsDto } from '@barakali/shared';
import {
  createTestApp,
  login,
  makeWorker,
  type Session,
  type TestApp,
} from '../../testing/helpers.js';

const ADMIN_PHONE = '+998907771122';
const COURIER = { courierName: 'Jasur', courierPhone: '+998 90 123 45 67' };
const ADDRESS = 'Yunusobod tumani, 4-mavze, 21-uy, 7-xonadon';
const CARD = { cardNumber: '4242 4242 4242 4242', expiry: '12/40', cvc: '123' };

let t: TestApp;
let admin: Session;
let worker: Awaited<ReturnType<typeof makeWorker>>;
let materialId: string;

const bearer = (who: Session) => ({ Authorization: `Bearer ${who.token}` });

async function inbox(who: Session): Promise<NotificationsDto> {
  return (await request(t.app).get('/api/my/notifications').set(bearer(who))).body;
}

async function paidOrder(): Promise<MaterialOrderDto> {
  const created = await request(t.app)
    .post('/api/material-orders')
    .set(bearer(worker))
    .send({ items: [{ materialId, quantity: 2 }], deliveryAddress: ADDRESS });
  expect(created.status).toBe(201);
  await request(t.app).post(`/api/material-orders/${created.body.id}/payment`).set(bearer(worker));
  const paid = await request(t.app)
    .post(`/api/material-orders/${created.body.id}/payment/confirm`)
    .set(bearer(worker))
    .send(CARD);
  expect(paid.body.status).toBe('paid');
  return paid.body;
}

const ship = (id: string, who: Session = admin, body: object = COURIER) =>
  request(t.app).post(`/api/admin/material-orders/${id}/ship`).set(bearer(who)).send(body);
const deliver = (id: string) =>
  request(t.app).post(`/api/admin/material-orders/${id}/deliver`).set(bearer(admin));

beforeAll(async () => {
  t = await createTestApp({ ADMIN_PHONES: ADMIN_PHONE });
  admin = await login(t.app, ADMIN_PHONE, 'Admin');
  worker = await makeWorker(t, 'Kashtachi');
  const material = await request(t.app)
    .post('/api/admin/materials')
    .set(bearer(admin))
    .send({ name: 'Ipak ip', price: 12_000, stock: 50 });
  materialId = material.body.id;
});
afterAll(() => t.close());

describe('materials delivery', () => {
  it('needs a delivery address to order', async () => {
    const res = await request(t.app)
      .post('/api/material-orders')
      .set(bearer(worker))
      .send({ items: [{ materialId, quantity: 1 }] });
    expect(res.status).toBe(400);
    expect(res.body.error.details.deliveryAddress).toBeDefined();
  });

  it('tells every administrator when a worker pays, and the list shows how to reach the worker', async () => {
    const before = (await inbox(admin)).unreadMaterials;
    const order = await paidOrder();
    const mail = await inbox(admin);
    expect(mail.unreadMaterials).toBe(before + 1);
    expect(mail.unread).toBe(0);
    const notice = mail.items.find((n) => n.materialOrderId === order.id);
    expect(notice?.kind).toBe('material_order_paid');

    const list = (await request(t.app).get('/api/admin/material-orders').set(bearer(admin)))
      .body as AdminMaterialOrderDto[];
    const row = list.find((o) => o.id === order.id);
    expect(row).toMatchObject({
      status: 'paid',
      deliveryAddress: ADDRESS,
      workerName: 'Kashtachi',
    });
    expect(row?.workerPhone).toBe(worker.phone);
    expect(list[0]?.status).toBe('paid');

    await request(t.app).post('/api/my/notifications/materials/read').set(bearer(admin));
    expect((await inbox(admin)).unreadMaterials).toBe(0);
  });

  it('ships with a courier, tells the worker who is coming, then delivers', async () => {
    const order = await paidOrder();
    expect((await deliver(order.id)).status).toBe(409);

    expect((await ship(order.id)).status).toBe(204);
    expect((await ship(order.id)).status).toBe(409);

    const mine = await request(t.app).get(`/api/material-orders/${order.id}`).set(bearer(worker));
    expect(mine.body).toMatchObject({
      status: 'shipped',
      courier: { name: 'Jasur', phone: '+998901234567' },
    });
    expect(mine.body.shippedAt).not.toBeNull();
    expect(mine.body).not.toHaveProperty('workerPhone');

    const mail = await inbox(worker);
    const notice = mail.items.find((n) => n.materialOrderId === order.id);
    expect(notice).toMatchObject({ kind: 'material_order_shipped', detail: 'Jasur', readAt: null });
    expect(mail.unreadMaterials).toBeGreaterThan(0);

    expect((await deliver(order.id)).status).toBe(204);
    expect((await deliver(order.id)).status).toBe(409);
    const done = await request(t.app).get(`/api/material-orders/${order.id}`).set(bearer(worker));
    expect(done.body.status).toBe('delivered');
    expect(done.body.deliveredAt).not.toBeNull();
  });

  it('validates the courier and keeps shipping to administrators', async () => {
    const order = await paidOrder();
    const badPhone = await ship(order.id, admin, { courierName: 'Jasur', courierPhone: '123' });
    expect(badPhone.status).toBe(400);
    expect((await ship(order.id, worker)).status).toBe(403);
    expect(
      (await request(t.app).get('/api/admin/material-orders').set(bearer(worker))).status,
    ).toBe(403);
  });

  it('records the shipment in the audit log without any phone number', async () => {
    const order = await paidOrder();
    await ship(order.id);
    const entry = await t.db
      .selectFrom('audit_log')
      .select(['action', 'details'])
      .where('target_id', '=', order.id)
      .executeTakeFirstOrThrow();
    expect(entry.action).toBe('material_order.ship');
    expect(JSON.stringify(entry.details)).not.toMatch(/\d{9}/);
  });
});
