import { loadConfig } from '../../config.js';
import { createDb } from '../client.js';
import { migrateToLatest } from '../migrator.js';
import { seedSampleData } from '../seed.js';

const db = await createDb(loadConfig());
await migrateToLatest(db);
const created = await seedSampleData(db);
console.log(created ? `Seeded ${created} workers with products` : 'Sample data already present');
await db.destroy();
