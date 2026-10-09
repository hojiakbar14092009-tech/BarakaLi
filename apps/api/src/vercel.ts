import migrations from 'virtual:migrations';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createPgDb } from './db/client.js';
import { migrateToLatest } from './db/migrator.js';
import { logger } from './logger.js';

const config = loadConfig();
if (!config.databaseUrl) throw new Error('DATABASE_URL is required');
const db = createPgDb(config.databaseUrl);

let migrated: Promise<void> | undefined;

/** Runs once per cold start (concurrent instances serialise on an advisory lock); retries after a failure. */
function ensureMigrated(): Promise<void> {
  migrated ??= migrateToLatest(db, migrations)
    .then((applied) => {
      if (applied.length > 0) logger.info('Migrations applied', { applied });
    })
    .catch((error: unknown) => {
      migrated = undefined;
      throw error;
    });
  return migrated;
}

export default createApp({ db, config, ready: ensureMigrated });
