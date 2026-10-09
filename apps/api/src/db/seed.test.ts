import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { loadConfig } from '../config.js';
import { createTestDb } from '../testing/test-db.js';
import { seedSampleData } from './seed.js';
import type { Db } from './client.js';

let db: Db;
beforeAll(async () => {
  db = await createTestDb();
});
afterAll(() => db.destroy());

describe('seed', () => {
  it('creates workers with images and a 3D model, and is idempotent', async () => {
    expect(await seedSampleData(db)).toBe(4);
    expect(await seedSampleData(db)).toBe(0);
    const app = createApp({ db, config: loadConfig({ NODE_ENV: 'test' }) });
    const res = await request(app).get('/api/products?pageSize=20');
    expect(res.body.total).toBe(10);
    const withModel = res.body.items.filter((p: { model: unknown }) => p.model);
    expect(withModel).toHaveLength(1);
    const featured = await request(app).get('/api/workers/featured');
    expect(featured.body).toHaveLength(4);
  });
});
