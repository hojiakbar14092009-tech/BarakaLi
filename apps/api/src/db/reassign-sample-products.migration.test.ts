import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sql } from 'kysely';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { WorkerSummaryDto } from '@barakali/shared';
import { createTestApp, makeWorker, type TestApp } from '../testing/helpers.js';
import { seedSampleData } from './seed.js';

const FILE = fileURLToPath(
  new URL('../../migrations/1760001800000_reassign_sample_products.sql', import.meta.url),
);
const [up = '', down = ''] = readFileSync(FILE, 'utf8')
  .split('-- Down Migration')
  .map((part) => part.replace('-- Up Migration', ''));
const SAMPLE_PHONES = ['+998900000001', '+998900000002', '+998900000003', '+998900000004'];

let t: TestApp;
afterAll(() => t.close());

async function categoryId(slug: string): Promise<string> {
  const row = await t.db
    .selectFrom('categories')
    .select('id')
    .where('slug', '=', slug)
    .executeTakeFirstOrThrow();
  return row.id;
}

async function workerIn(name: string, slug: string, reviewed: boolean): Promise<string> {
  const worker = await makeWorker(t, name, { approved: false });
  await t.db
    .updateTable('workers')
    .set({
      status: 'approved',
      category_id: await categoryId(slug),
      reviewed_at: reviewed ? new Date() : null,
    })
    .where('id', '=', worker.workerId)
    .execute();
  return worker.workerId;
}

async function sampleProducts() {
  return t.db
    .selectFrom('products as p')
    .innerJoin('workers as w', 'w.id', 'p.worker_id')
    .innerJoin('users as u', 'u.id', 'w.user_id')
    .innerJoin('categories as c', 'c.id', 'p.category_id')
    .select(['p.id', 'p.status', 'c.slug'])
    .where('u.phone', 'in', SAMPLE_PHONES)
    .execute();
}

const imageCounts = async () =>
  t.db
    .selectFrom('product_images')
    .select(['product_id', (eb) => eb.fn.countAll<number>().as('n')])
    .groupBy('product_id')
    .execute();

let tailor: string;
let baker: string;
let unreviewed: string;
let hiddenId: string;
let before: { id: string; status: string; slug: string }[];
let imagesBefore: Awaited<ReturnType<typeof imageCounts>>;

beforeAll(async () => {
  t = await createTestApp();
  await seedSampleData(t.db);
  tailor = await workerIn('Tikuvchi tasdiqlangan', 'tikuvchilik', true);
  baker = await workerIn('Qandolatchi tasdiqlangan', 'pishiriq', true);
  unreviewed = await workerIn('Koʻrilmagan usta', 'dizayn', false);
  before = await sampleProducts();
  hiddenId = before[0]?.id ?? '';
  await t.db.updateTable('products').set({ status: 'hidden' }).where('id', '=', hiddenId).execute();
  imagesBefore = await imageCounts();
  // The migration already ran on the empty database; run it again on the seeded one.
  await sql`DROP TABLE sample_product_reassignments`.execute(t.db);
  await sql.raw(up).execute(t.db);
});

describe('reassign sample products migration', () => {
  it('hands every published sample work to admin-reviewed workers only', async () => {
    const owners = await t.db
      .selectFrom('products')
      .select(['id', 'worker_id'])
      .where(
        'id',
        'in',
        before.map((p) => p.id),
      )
      .execute();
    const owner = new Map(owners.map((row) => [row.id, row.worker_id]));
    const published = before.filter((p) => p.id !== hiddenId);
    for (const product of published) expect([tailor, baker]).toContain(owner.get(product.id));
    expect(owners.map((row) => row.worker_id)).not.toContain(unreviewed);
    // Both reviewed workers get a share.
    const counts = published.map((p) => owner.get(p.id));
    expect(counts.filter((id) => id === tailor).length).toBeGreaterThan(0);
    expect(counts.filter((id) => id === baker).length).toBeGreaterThan(0);
    // A hidden sample product stays where it was.
    expect((await sampleProducts()).map((p) => p.id)).toEqual([hiddenId]);
  });

  it('prefers a worker of the product category', async () => {
    const rows = await t.db
      .selectFrom('products as p')
      .innerJoin('categories as c', 'c.id', 'p.category_id')
      .select(['p.worker_id', 'c.slug'])
      .where(
        'p.id',
        'in',
        before.filter((p) => p.id !== hiddenId).map((p) => p.id),
      )
      .execute();
    for (const row of rows.filter((r) => r.slug === 'tikuvchilik'))
      expect(row.worker_id).toBe(tailor);
    for (const row of rows.filter((r) => r.slug === 'pishiriq')) expect(row.worker_id).toBe(baker);
  });

  it('keeps every photo and the 3D model, and the new owners are recommended', async () => {
    expect(await imageCounts()).toEqual(expect.arrayContaining(imagesBefore));
    expect((await imageCounts()).length).toBe(imagesBefore.length);
    const models = await t.db.selectFrom('product_models').select('product_id').execute();
    expect(models).toHaveLength(1);
    const featured = (await request(t.app).get('/api/workers/featured')).body as WorkerSummaryDto[];
    expect(featured.map((w) => w.id).sort()).toEqual([tailor, baker].sort());
  });

  it('records each move so the down migration puts the products back', async () => {
    const moves = await sql<{ n: number }>`
      SELECT count(*)::int AS n FROM sample_product_reassignments`.execute(t.db);
    expect(moves.rows[0]?.n).toBe(before.length - 1);
    await sql.raw(down).execute(t.db);
    expect((await sampleProducts()).length).toBe(before.length);
  });
});
