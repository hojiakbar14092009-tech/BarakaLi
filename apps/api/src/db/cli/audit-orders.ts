import { loadConfig } from '../../config.js';
import { findMismatchedOrders } from '../audit.js';
import { createDb } from '../client.js';

// Read-only report of orders whose product lines belong to another worker. Prints ids only.
const db = await createDb(loadConfig());
const mismatched = await findMismatchedOrders(db);
if (mismatched.length === 0) {
  console.log('No mismatched orders');
} else {
  console.log(`Mismatched orders: ${mismatched.length}`);
  for (const order of mismatched) {
    console.log(
      [
        order.orderId,
        order.status,
        order.createdAt.toISOString(),
        `order.worker_id=${order.orderWorkerId}`,
        `product.worker_id=${order.productWorkerIds.join('|')}`,
      ].join('  '),
    );
  }
}
await db.destroy();
