import { buildContext, createApp } from './app.js';
import { loadConfig } from './config.js';
import { createDb } from './db/client.js';
import { migrateToLatest } from './db/migrator.js';
import { seedSampleData } from './db/seed.js';
import { logger } from './logger.js';
import { startMaintenance } from './modules/jobs/maintenance.js';

const config = loadConfig();
const db = await createDb(config);
const applied = await migrateToLatest(db);
if (applied.length > 0) logger.info('Migrations applied', { applied });

if (config.seedSampleData) await seedSampleData(db);

const ctx = buildContext({ db, config });
startMaintenance(ctx);
createApp({ db, config, context: ctx }).listen(config.port, () => {
  logger.info('API listening', { port: config.port });
});
