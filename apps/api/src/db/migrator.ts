import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { sql, type Kysely } from 'kysely';
import type { Database } from './schema.js';

const UP_MARKER = '-- Up Migration';
const DOWN_MARKER = '-- Down Migration';
const ADVISORY_LOCK_KEY = 7_401_001;

export interface Migration {
  name: string;
  up: string;
}

/** Resolved lazily: serverless bundles embed migrations and never touch the filesystem. */
function defaultMigrationsDir(): string {
  return fileURLToPath(new URL('../../migrations', import.meta.url));
}

export function parseMigration(name: string, content: string): Migration {
  const upIndex = content.indexOf(UP_MARKER);
  if (upIndex === -1) throw new Error(`Migration ${name} has no "${UP_MARKER}" section`);
  const downIndex = content.indexOf(DOWN_MARKER);
  const end = downIndex === -1 ? content.length : downIndex;
  return { name, up: content.slice(upIndex + UP_MARKER.length, end).trim() };
}

export function loadMigrations(dir = defaultMigrationsDir()): Migration[] {
  return readdirSync(dir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => parseMigration(file, readFileSync(join(dir, file), 'utf8')));
}

/** Applies pending migrations once, serialised across concurrent cold starts. */
export async function migrateToLatest(
  db: Kysely<Database>,
  migrations: Migration[] = loadMigrations(),
): Promise<string[]> {
  const applied: string[] = [];
  await db.transaction().execute(async (trx) => {
    await sql`select pg_advisory_xact_lock(${ADVISORY_LOCK_KEY})`.execute(trx);
    await sql`create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )`.execute(trx);
    const done = await sql<{ name: string }>`select name from schema_migrations`.execute(trx);
    const doneNames = new Set(done.rows.map((row) => row.name));
    for (const migration of migrations) {
      if (doneNames.has(migration.name)) continue;
      await sql.raw(migration.up).execute(trx);
      await sql`insert into schema_migrations (name) values (${migration.name})`.execute(trx);
      applied.push(migration.name);
    }
  });
  return applied;
}
