import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createDb } from './db/client.js';
import { migrateToLatest } from './db/migrator.js';
import { logger } from './logger.js';

const config = loadConfig();
const db = await createDb(config);
const applied = await migrateToLatest(db);
if (applied.length > 0) logger.info('Migrations applied', { applied });

createApp({ db, config }).listen(config.port, () => {
  logger.info('API listening', { port: config.port });
});
