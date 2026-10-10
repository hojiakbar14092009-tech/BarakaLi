import type { RequestHandler } from 'express';
import type { AppContext } from '../../context.js';
import { InProcessJobQueue, type JobQueue } from '../../infra/queue.js';
import { logger } from '../../logger.js';
import {
  expireUnpaidMaterialOrders,
  expireUnpaidOrders,
  refundUnacceptedOrders,
} from './order-expiry.js';

const SWEEP_INTERVAL_MS = 60 * 1000;

export interface MaintenanceResult {
  cancelled: number;
  refunded: number;
}

export async function runMaintenance(
  ctx: AppContext,
  now = new Date(),
): Promise<MaintenanceResult> {
  const cancelled =
    (await expireUnpaidOrders(ctx.db, now)) + (await expireUnpaidMaterialOrders(ctx.db, now));
  const refunded = await refundUnacceptedOrders(ctx, now);
  if (cancelled > 0 || refunded > 0) logger.info('Maintenance finished', { cancelled, refunded });
  return { cancelled, refunded };
}

/** Long-running servers: registers the sweep on a queue and returns it so the caller can stop it. */
export function startMaintenance(ctx: AppContext): JobQueue {
  const queue = new InProcessJobQueue((name, error) => {
    logger.error('Job failed', {
      job: name,
      message: error instanceof Error ? error.message : 'unknown',
    });
  });
  queue.every('order-maintenance', SWEEP_INTERVAL_MS, () => runMaintenance(ctx));
  queue.start();
  return queue;
}

/**
 * Serverless hosting has no long-lived process, so the same sweep rides on incoming requests,
 * at most once per interval per instance. A failure never fails the request itself.
 */
export function requestDrivenMaintenance(ctx: AppContext): RequestHandler {
  let lastRun = 0;
  return (_req, _res, next) => {
    const nowMs = Date.now();
    if (nowMs - lastRun < SWEEP_INTERVAL_MS) return next();
    lastRun = nowMs;
    runMaintenance(ctx).then(
      () => next(),
      (error: unknown) => {
        lastRun = 0;
        logger.error('Maintenance failed', {
          message: error instanceof Error ? error.message : 'unknown',
        });
        next();
      },
    );
  };
}
