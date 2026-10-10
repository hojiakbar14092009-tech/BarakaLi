import { Router, type Request } from 'express';
import { availabilityInputSchema } from '@barakali/shared';
import type { AppContext } from '../../context.js';
import { AppError } from '../../errors.js';
import { createAuthMiddleware } from '../../middleware/auth.js';
import { AvailabilityService } from './availability.service.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function idParam(req: Request): string {
  const value = req.params.id;
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw AppError.notFound();
  return value;
}

export function createCalendarRouter(ctx: AppContext): Router {
  const router = Router();
  const service = new AvailabilityService(ctx);
  const { requireWorker } = createAuthMiddleware(ctx);
  const workerId = (req: Request): string => req.workerId ?? '';

  router.get('/workers/:id/availability', async (req, res) => {
    const id = idParam(req);
    if (!(await service.workerExists(id))) throw AppError.notFound();
    res.json(await service.read(id));
  });

  router.get('/my/availability', requireWorker, async (req, res) => {
    res.json(await service.read(workerId(req)));
  });

  router.post('/my/availability', requireWorker, async (req, res) => {
    const input = availabilityInputSchema.parse(req.body);
    res.status(201).json(await service.add(workerId(req), input));
  });

  router.delete('/my/availability/:id', requireWorker, async (req, res) => {
    await service.remove(workerId(req), idParam(req));
    res.status(204).end();
  });

  return router;
}
