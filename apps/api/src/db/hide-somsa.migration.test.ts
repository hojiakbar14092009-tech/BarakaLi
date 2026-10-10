import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDb } from '../testing/test-db.js';
import type { Db } from './client.js';
import { loadMigrations } from './migrator.js';
import { seedSampleData } from './seed.js';

let db: Db;
beforeAll(async () => {
  db = await createTestDb();
  await seedSampleData(db);
});
afterAll(() => db.destroy());

async function addProduct(title: string, categorySlug: string): Promise<string> {
  const worker = await db.selectFrom('workers').select('id').executeTakeFirstOrThrow();
  const category = await db
    .selectFrom('categories')
    .select('id')
    .where('slug', '=', categorySlug)
    .executeTakeFirstOrThrow();
  const row = await db
    .insertInto('products')
    .values({
      worker_id: worker.id,
      category_id: category.id,
      title,
      description: '',
      retail_price: 5_000,
      stock: 10,
      status: 'published',
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  return row.id;
}

describe('hide_somsa migration', () => {
  it('hides somsa in Pishiriq without deleting it, and leaves other products alone', async () => {
    const somsa = await addProduct('Tandirda pishgan somsa', 'pishiriq');
    const samsa = await addProduct('Goʻshtli SAMSA', 'pishiriq');
    const cake = await addProduct('Asal tort', 'pishiriq');
    const migration = loadMigrations().find((m) => m.name.endsWith('_hide_somsa.sql'));
    expect(migration).toBeDefined();
    await sql.raw(migration?.up ?? '').execute(db);

    const rows = await db
      .selectFrom('products')
      .select(['id', 'status'])
      .where('id', 'in', [somsa, samsa, cake])
      .execute();
    const status = new Map(rows.map((row) => [row.id, row.status]));
    expect(status.get(somsa)).toBe('hidden');
    expect(status.get(samsa)).toBe('hidden');
    expect(status.get(cake)).toBe('published');
  });
});
