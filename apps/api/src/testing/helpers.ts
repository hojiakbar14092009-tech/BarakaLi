import { randomUUID } from 'node:crypto';
import type { Express } from 'express';
import sharp from 'sharp';
import request from 'supertest';
import type { AuthResponse, ProductDto } from '@barakali/shared';
import { createApp } from '../app.js';
import { loadConfig } from '../config.js';
import type { Db } from '../db/client.js';
import { createTestDb } from './test-db.js';

export interface TestApp {
  app: Express;
  db: Db;
  queries: { count: number };
  close(): Promise<void>;
}

export async function createTestApp(env: Record<string, string> = {}): Promise<TestApp> {
  const queries = { count: 0 };
  const db = await createTestDb((event) => {
    if (event.level === 'query') queries.count += 1;
  });
  const config = loadConfig({ NODE_ENV: 'test', EXPOSE_SMS_CODE: 'true', ...env });
  return { app: createApp({ db, config }), db, queries, close: () => db.destroy() };
}

let phoneCounter = 0;
export function nextPhone(): string {
  phoneCounter += 1;
  return `+99890${String(1000000 + phoneCounter)}`;
}

export interface Session {
  token: string;
  userId: string;
  phone: string;
}

export async function login(
  app: Express,
  phone = nextPhone(),
  name = 'Test User',
): Promise<Session> {
  const codeRes = await request(app).post('/api/auth/request-code').send({ phone });
  const verify = await request(app)
    .post('/api/auth/verify')
    .send({ phone, code: codeRes.body.code, name });
  const body = verify.body as AuthResponse;
  return { token: body.accessToken, userId: body.user.id, phone };
}

export async function firstCategoryId(db: Db): Promise<string> {
  const row = await db
    .selectFrom('categories')
    .select('id')
    .orderBy('position')
    .executeTakeFirstOrThrow();
  return row.id;
}

/** Signs up a worker. Applications start pending; tests get an approved worker unless told not to. */
export async function makeWorker(
  t: TestApp,
  name = 'Dilnoza',
  options: { approved?: boolean } = {},
): Promise<Session & { workerId: string }> {
  const session = await login(t.app, nextPhone(), name);
  const res = await request(t.app)
    .post('/api/me/worker')
    .set('Authorization', `Bearer ${session.token}`)
    .send({ displayName: name, categoryId: await firstCategoryId(t.db) });
  const workerId = res.body.workerId as string;
  if (options.approved !== false) {
    await t.db
      .updateTable('workers')
      .set({ status: 'approved' })
      .where('id', '=', workerId)
      .execute();
  }
  return { ...session, workerId };
}

export async function pngBuffer(width = 40, height = 30): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: '#b6a593' } })
    .png()
    .toBuffer();
}

export interface ProductSeed {
  title?: string;
  retailPrice?: number;
  wholesalePrice?: number | null;
  wholesaleMinQty?: number | null;
  stock?: number;
  publish?: boolean;
}

export async function makeProduct(
  t: TestApp,
  worker: Session,
  seed: ProductSeed = {},
): Promise<ProductDto> {
  const auth = { Authorization: `Bearer ${worker.token}` };
  const created = await request(t.app)
    .post('/api/my/products')
    .set(auth)
    .send({
      title: seed.title ?? `Mahsulot ${randomUUID().slice(0, 6)}`,
      categoryId: await firstCategoryId(t.db),
      retailPrice: seed.retailPrice ?? 100_000,
      wholesalePrice: seed.wholesalePrice ?? null,
      wholesaleMinQty: seed.wholesaleMinQty ?? null,
      stock: seed.stock ?? 10,
    });
  const id = created.body.id as string;
  if (seed.publish === false) return created.body as ProductDto;
  await request(t.app)
    .post(`/api/my/products/${id}/images`)
    .set(auth)
    .attach('image', await pngBuffer(), { filename: 'a.png', contentType: 'image/png' });
  const published = await request(t.app)
    .patch(`/api/my/products/${id}/status`)
    .set(auth)
    .send({ status: 'published' });
  return published.body as ProductDto;
}

const TEST_CARD = { cardNumber: '4242424242424242', expiry: '12/40', cvc: '123' };

/** Buys one product and pays for it; resolves with the new order id (status `new`). */
export async function placePaidOrder(
  t: TestApp,
  buyer: Session,
  productId: string,
  quantity = 1,
): Promise<string> {
  const auth = { Authorization: `Bearer ${buyer.token}` };
  const created = await request(t.app)
    .post('/api/orders')
    .set(auth)
    .send({ items: [{ productId, quantity }], fulfillment: 'pickup' });
  const orderId = (created.body as { id: string }[])[0]?.id ?? '';
  await request(t.app).post(`/api/orders/${orderId}/payment`).set(auth);
  await request(t.app).post(`/api/orders/${orderId}/payment/confirm`).set(auth).send(TEST_CARD);
  return orderId;
}

/** Walks an order through the worker's actions up to `delivered`. */
export async function deliverOrder(t: TestApp, seller: Session, orderId: string): Promise<void> {
  for (const action of ['accept', 'start', 'ready', 'deliver']) {
    await request(t.app)
      .post(`/api/orders/${orderId}/actions`)
      .set({ Authorization: `Bearer ${seller.token}` })
      .send({ action });
  }
}
