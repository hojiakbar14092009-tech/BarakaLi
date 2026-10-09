import migrations from 'virtual:migrations';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createPgDb } from './db/client.js';
import { migrateToLatest } from './db/migrator.js';
import { seedSampleData } from './db/seed.js';
import { logger } from './logger.js';

const config = loadConfig();
if (!config.databaseUrl) throw new Error('DATABASE_URL is required');
const db = createPgDb(config.databaseUrl);

let migrated: Promise<void> | undefined;

/** Sample content is optional: a concurrent cold start losing the race must not take the site down. */
async function seedWithoutBlocking(): Promise<void> {
  try {
    const created = await seedSampleData(db);
    if (created > 0) logger.info('Sample data added', { workers: created });
  } catch (error) {
    logger.warn('Sample data was not added', {
      message: error instanceof Error ? error.message : 'unknown',
    });
  }
}

/** Runs once per cold start (concurrent instances serialise on an advisory lock); retries after a failure. */
function ensureMigrated(): Promise<void> {
  migrated ??= migrateToLatest(db, migrations)
    .then(async (applied) => {
      if (applied.length > 0) logger.info('Migrations applied', { applied });
      if (config.seedSampleData) await seedWithoutBlocking();
    })
    .catch((error: unknown) => {
      migrated = undefined;
      throw error;
    });
  return migrated;
}

export default createApp({ db, config, ready: ensureMigrated });
