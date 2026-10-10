import request from 'supertest';
import type { Express } from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import type { Db } from './db/client.js';
import { createTestDb } from './testing/test-db.js';

let db: Db;
let app: Express;

beforeAll(async () => {
  db = await createTestDb();
  app = createApp({ db, config: loadConfig({ NODE_ENV: 'test' }) });
});
afterAll(async () => {
  await db.destroy();
});

describe('app', () => {
  it('answers the health check', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('returns a coded 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('rejects state-changing requests from a foreign origin', async () => {
    const res = await request(app).post('/api/health').set('Origin', 'https://evil.example');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('lists the four active categories', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(4);
  });
});
