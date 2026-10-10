import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDb } from '../testing/test-db.js';
import type { Db } from './client.js';
import { migrateToLatest, parseMigration } from './migrator.js';

let db: Db;

beforeAll(async () => {
  db = await createTestDb();
});
afterAll(async () => {
  await db.destroy();
});

describe('database', () => {
  it('seeds four active categories and keeps the retired remote-work row inactive', async () => {
    const rows = await db
      .selectFrom('categories')
      .select(['slug', 'is_active'])
      .orderBy('position')
      .execute();
    expect(rows.filter((r) => r.is_active).map((r) => r.slug)).toEqual([
      'tikuvchilik',
      'pishiriq',
      'qol-mehnati',
      'dizayn',
    ]);
    expect(rows.find((r) => r.slug === 'masofaviy-ishlar')?.is_active).toBe(false);
  });

  it('does not re-apply migrations on a second run', async () => {
    expect(await migrateToLatest(db)).toEqual([]);
  });

  it('returns bigint money columns as numbers', async () => {
    const user = await db
      .insertInto('users')
      .values({ phone: '+998900000001', name: 'Ali' })
      .returning('id')
      .executeTakeFirstOrThrow();
    const worker = await db
      .insertInto('workers')
      .values({
        user_id: user.id,
        category_id: (await db.selectFrom('categories').select('id').executeTakeFirstOrThrow()).id,
        display_name: 'Ustoz',
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    const product = await db
      .insertInto('products')
      .values({
        worker_id: worker.id,
        category_id: (await db.selectFrom('categories').select('id').executeTakeFirstOrThrow()).id,
        title: 'Sumka',
        retail_price: 120_000,
        wholesale_price: null,
        wholesale_min_qty: null,
      })
      .returning(['retail_price'])
      .executeTakeFirstOrThrow();
    expect(product.retail_price).toBe(120_000);
  });

  it('rejects a wholesale price that is not below retail at the database level', async () => {
    const ids = await sql<{ w: string; c: string }>`
      select (select id from workers limit 1) as w, (select id from categories limit 1) as c`.execute(
      db,
    );
    const row = ids.rows[0];
    await expect(
      db
        .insertInto('products')
        .values({
          worker_id: row?.w ?? '',
          category_id: row?.c ?? '',
          title: 'Bad',
          retail_price: 1000,
          wholesale_price: 1000,
          wholesale_min_qty: 5,
        })
        .execute(),
    ).rejects.toThrow();
  });

  it('parses migrations and requires the up marker', () => {
    expect(() => parseMigration('x.sql', 'select 1')).toThrow();
    expect(
      parseMigration('x.sql', '-- Up Migration\nselect 1;\n-- Down Migration\nselect 2;').up,
    ).toBe('select 1;');
  });
});
