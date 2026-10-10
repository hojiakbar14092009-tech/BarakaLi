import { Router, type Request } from 'express';
import { cardPaymentSchema, materialOrderSchema } from '@barakali/shared';
import type { AppContext } from '../../context.js';
import { AppError } from '../../errors.js';
import { createAuthMiddleware } from '../../middleware/auth.js';
import { MaterialService } from './material.service.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function idParam(req: Request): string {
  const value = req.params.id;
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw AppError.notFound();
  return value;
}

/** The materials store is for workers only; admins manage the catalog under /admin. */
export function createMaterialRouter(ctx: AppContext): Router {
  const router = Router();
  const service = new MaterialService(ctx);
  const { requireWorker } = createAuthMiddleware(ctx);
  const workerId = (req: Request): string => req.workerId ?? '';

  router.get('/materials', requireWorker, async (_req, res) => {
    res.json(await service.listActive());
  });

  router.get('/material-orders', requireWorker, async (req, res) => {
    res.json(await service.listForWorker(workerId(req)));
  });

  router.post('/material-orders', requireWorker, async (req, res) => {
    const input = materialOrderSchema.parse(req.body);
    res.status(201).json(await service.createOrder(workerId(req), input));
  });

  router.get('/material-orders/:id', requireWorker, async (req, res) => {
    res.json(await service.getOwned(workerId(req), idParam(req)));
  });

  router.post('/material-orders/:id/payment', requireWorker, async (req, res) => {
    res.json(await service.startPayment(workerId(req), idParam(req)));
  });

  router.post('/material-orders/:id/payment/confirm', requireWorker, async (req, res) => {
    const card = cardPaymentSchema.parse(req.body);
    res.json(await service.confirmPayment(workerId(req), idParam(req), card));
  });

  return router;
}
