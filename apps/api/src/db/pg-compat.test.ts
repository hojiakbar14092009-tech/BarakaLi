import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { loadConfig } from '../config.js';
import { login } from '../testing/helpers.js';
import { createPgDb, type Db } from './client.js';
import { migrateToLatest } from './migrator.js';
import { seedSampleData } from './seed.js';

const PORT = 54_329;

let server: PGLiteSocketServer;
let db: Db;
let app: Express;

beforeAll(async () => {
  const engine = await PGlite.create({ extensions: { pg_trgm, btree_gist } });
  server = new PGLiteSocketServer({ db: engine, port: PORT, host: '127.0.0.1', maxConnections: 1 });
  await server.start();
  process.env.PG_POOL_MAX = '1';
  db = createPgDb(`postgres://postgres:postgres@127.0.0.1:${PORT}/postgres?sslmode=disable`);
  await migrateToLatest(db);
  await seedSampleData(db);
  app = createApp({ db, config: loadConfig({ NODE_ENV: 'test' }) });
});

afterAll(async () => {
  await db.destroy();
  await server.stop();
});

describe('node-postgres driver (the production path)', () => {
  it('returns money and ratings as numbers and binary files intact', async () => {
    const res = await request(app).get('/api/products?pageSize=20');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(9);
    expect(typeof res.body.items[0].retailPrice).toBe('number');
    const model = res.body.items.find((p: { model: unknown }) => p.model).model;
    const file = await request(app)
      .get(model.fileUrl)
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(file.headers['content-type']).toBe('model/gltf-binary');
    expect((file.body as Buffer).subarray(0, 4).toString('latin1')).toBe('glTF');
    expect((file.body as Buffer).length).toBe(model.fileSize);
  });

  it('runs the full purchase flow with transactions and row locks', async () => {
    const buyer = await login(app, '+998933333333', 'Haridor');
    const list = await request(app).get('/api/products?q=pakhlava');
    const product = list.body.items[0];
    const created = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ items: [{ productId: product.id, quantity: 10 }], fulfillment: 'pickup' });
    expect(created.body[0]).toMatchObject({
      total: 720_000,
      commission: 14_400,
      commissionRate: 0.02,
    });
    const orderId = created.body[0].id as string;
    const paid = await request(app)
      .post(`/api/orders/${orderId}/payment/confirm`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ cardNumber: '4242424242424242', expiry: '12/40', cvc: '123' });
    expect(paid.status).toBe(409);
    await request(app)
      .post(`/api/orders/${orderId}/payment`)
      .set('Authorization', `Bearer ${buyer.token}`);
    const confirmed = await request(app)
      .post(`/api/orders/${orderId}/payment/confirm`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ cardNumber: '4242424242424242', expiry: '12/40', cvc: '123' });
    expect(confirmed.body.status).toBe('new');
    const stock = await db
      .selectFrom('products')
      .select('stock')
      .where('id', '=', product.id)
      .executeTakeFirstOrThrow();
    expect(stock.stock).toBe(20);
  });
});
