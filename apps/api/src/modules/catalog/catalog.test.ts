import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { makeProduct, makeWorker, type TestApp, createTestApp } from '../../testing/helpers.js';
import { normalizeSearch } from '../products/product.repository.js';

let t: TestApp;
let worker: Awaited<ReturnType<typeof makeWorker>>;

beforeAll(async () => {
  t = await createTestApp();
  worker = await makeWorker(t, 'Gulnora');
  await makeProduct(t, worker, { title: "Qo'l mehnati sumka", retailPrice: 90_000 });
  await makeProduct(t, worker, { title: 'Kashta ro‘mol', retailPrice: 50_000 });
  await makeProduct(t, worker, { title: 'Yashirin mahsulot', publish: false });
  for (let i = 0; i < 6; i += 1) await makeProduct(t, worker, { title: `Sovun ${i}` });
});
afterAll(() => t.close());

describe('product listing', () => {
  it('shows only published products and paginates', async () => {
    const res = await request(t.app).get('/api/products?pageSize=5&page=1');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(8);
    expect(res.body.items).toHaveLength(5);
    const titles = res.body.items.map((p: { title: string }) => p.title);
    expect(titles).not.toContain('Yashirin mahsulot');
    const second = await request(t.app).get('/api/products?pageSize=5&page=2');
    expect(second.body.items).toHaveLength(3);
  });

  it('matches every Uzbek apostrophe variant in search', async () => {
    for (const q of ["qo'l", 'qoʻl', 'qo‘l', 'qo’l', 'QOʼL']) {
      const res = await request(t.app).get('/api/products').query({ q });
      expect(res.body.items.map((p: { title: string }) => p.title)).toEqual(["Qo'l mehnati sumka"]);
    }
  });

  it('treats % and _ in search as plain characters', async () => {
    const res = await request(t.app).get('/api/products').query({ q: '%' });
    expect(res.body.total).toBe(0);
  });

  it('sorts by price', async () => {
    const res = await request(t.app).get('/api/products?sort=price_asc&pageSize=2');
    expect(res.body.items[0].retailPrice).toBeLessThanOrEqual(res.body.items[1].retailPrice);
  });

  it('filters by category slug and accepts "barchasi" as all', async () => {
    const hit = await request(t.app).get('/api/products?category=tikuvchilik');
    expect(hit.body.total).toBe(8);
    const miss = await request(t.app).get('/api/products?category=pishiriq');
    expect(miss.body.total).toBe(0);
    const all = await request(t.app).get('/api/products?category=barchasi');
    expect(all.body.total).toBe(8);
  });

  it('runs a fixed number of queries regardless of page size (no N+1)', async () => {
    const run = async (pageSize: number) => {
      const before = t.queries.count;
      await request(t.app).get(`/api/products?pageSize=${pageSize}`);
      return t.queries.count - before;
    };
    const small = await run(1);
    const large = await run(8);
    expect(large).toBe(small);
    expect(large).toBeLessThanOrEqual(6);
  });

  it('rejects a page size above the maximum', async () => {
    const res = await request(t.app).get('/api/products?pageSize=500');
    expect(res.status).toBe(400);
  });
});

describe('product details and visibility', () => {
  it('hides drafts from the public but shows them to the owner', async () => {
    const draft = await makeProduct(t, worker, { title: 'Qoralama', publish: false });
    expect((await request(t.app).get(`/api/products/${draft.id}`)).status).toBe(404);
    const own = await request(t.app)
      .get(`/api/products/${draft.id}`)
      .set('Authorization', `Bearer ${worker.token}`);
    expect(own.status).toBe(200);
  });

  it('returns 404 for malformed ids', async () => {
    const res = await request(t.app).get('/api/products/not-a-uuid');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('never exposes phone numbers in public responses', async () => {
    const res = await request(t.app).get('/api/products');
    const featured = await request(t.app).get('/api/workers/featured');
    const text = JSON.stringify([res.body, featured.body]);
    expect(text).not.toContain(worker.phone);
    expect(text).not.toMatch(/\+998\d{9}/);
  });
});

describe('workers', () => {
  it('lists featured workers with their minimum published price', async () => {
    const res = await request(t.app).get('/api/workers/featured');
    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({
      displayName: 'Gulnora',
      minPrice: 50_000,
      productsCount: 8,
    });
  });

  it('returns a worker profile and 404 for an unknown one', async () => {
    expect((await request(t.app).get(`/api/workers/${worker.workerId}`)).status).toBe(200);
    const missing = await request(t.app).get('/api/workers/00000000-0000-4000-8000-000000000000');
    expect(missing.status).toBe(404);
  });
});

describe('retired remote-work category', () => {
  const retiredId = async () =>
    (
      await t.db
        .selectFrom('categories')
        .select('id')
        .where('slug', '=', 'masofaviy-ishlar')
        .executeTakeFirstOrThrow()
    ).id;

  it('is not returned by the category list', async () => {
    const res = await request(t.app).get('/api/categories');
    const slugs = res.body.map((c: { slug: string }) => c.slug);
    expect(slugs).toEqual(['tikuvchilik', 'pishiriq', 'qol-mehnati', 'dizayn']);
  });

  it('cannot be chosen for a new product', async () => {
    const res = await request(t.app)
      .post('/api/my/products')
      .set('Authorization', `Bearer ${worker.token}`)
      .send({ title: 'Yangi', categoryId: await retiredId(), retailPrice: 10_000, stock: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual({ categoryId: ['NOT_FOUND'] });
  });

  it('keeps legacy products in the database but out of public listings', async () => {
    const legacy = await makeProduct(t, worker, { title: 'Eski masofaviy ish' });
    await t.db
      .updateTable('products')
      .set({ category_id: await retiredId() })
      .where('id', '=', legacy.id)
      .execute();
    const res = await request(t.app).get('/api/products').query({ q: 'Eski masofaviy' });
    expect(res.body.total).toBe(0);
    const stored = await t.db
      .selectFrom('products')
      .select('id')
      .where('id', '=', legacy.id)
      .executeTakeFirst();
    expect(stored?.id).toBe(legacy.id);
  });
});

describe('normalizeSearch', () => {
  it('removes apostrophe variants and lowercases', () => {
    expect(normalizeSearch("O'ZBEK")).toBe('ozbek');
    expect(normalizeSearch('gʻisht')).toBe('gisht');
  });
});
