import { loadConfig } from '../../config.js';
import { createDb } from '../client.js';
import { migrateToLatest } from '../migrator.js';

const db = await createDb(loadConfig());
const applied = await migrateToLatest(db);
console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Database is up to date');
await db.destroy();
