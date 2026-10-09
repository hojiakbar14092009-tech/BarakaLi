import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Kysely, PostgresDialect, type LogConfig } from 'kysely';
import pg from 'pg';
import type { AppConfig } from '../config.js';
import type { Database } from './schema.js';

export type Db = Kysely<Database>;

const INT8_OID = 20;
const NUMERIC_OID = 1700;
const toNumber = (value: string) => Number(value);

// Money is stored as bigint but stays well below 2^53, so plain numbers are safe.
pg.types.setTypeParser(INT8_OID, toNumber);
pg.types.setTypeParser(NUMERIC_OID, toNumber);

// Lazy: import.meta.url does not exist inside the CommonJS serverless bundle.
const localDataDir = () => fileURLToPath(new URL('../../../../.data/pglite', import.meta.url));

export async function createPgliteDb(dataDir?: string, log?: LogConfig): Promise<Db> {
  const [{ PGlite }, { pg_trgm }, { btree_gist }, { PGliteDialect }] = await Promise.all([
    import('@electric-sql/pglite'),
    import('@electric-sql/pglite/contrib/pg_trgm'),
    import('@electric-sql/pglite/contrib/btree_gist'),
    import('./pglite-dialect.js'),
  ]);
  if (dataDir) mkdirSync(dataDir, { recursive: true });
  const client = new PGlite({
    dataDir,
    extensions: { pg_trgm, btree_gist },
    parsers: { [INT8_OID]: toNumber, [NUMERIC_OID]: toNumber },
  });
  return new Kysely<Database>({ dialect: new PGliteDialect(client), log });
}

export function createPgDb(connectionString: string): Db {
  const pool = new pg.Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX ?? 3),
    ssl: /sslmode=disable|localhost|127\.0\.0\.1/.test(connectionString)
      ? undefined
      : { rejectUnauthorized: false },
  });
  return new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
}

export async function createDb(config: AppConfig): Promise<Db> {
  if (config.databaseUrl) return createPgDb(config.databaseUrl);
  return createPgliteDb(localDataDir());
}
