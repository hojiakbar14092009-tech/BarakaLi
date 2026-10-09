import type { LogConfig } from 'kysely';
import { createPgliteDb, type Db } from '../db/client.js';
import { migrateToLatest } from '../db/migrator.js';

/** Fresh in-memory PostgreSQL with all migrations applied. */
export async function createTestDb(log?: LogConfig): Promise<Db> {
  const db = await createPgliteDb(undefined, log);
  await migrateToLatest(db);
  return db;
}
