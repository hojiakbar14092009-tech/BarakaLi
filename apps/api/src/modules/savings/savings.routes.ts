import { Router, type Request } from 'express';
import { savingsGoalSchema } from '@barakali/shared';
import type { AppContext } from '../../context.js';
import { createAuthMiddleware } from '../../middleware/auth.js';
import { SavingsService } from './savings.service.js';

export function createSavingsRouter(ctx: AppContext): Router {
  const router = Router();
  const service = new SavingsService(ctx);
  const { requireWorker } = createAuthMiddleware(ctx);
  const workerId = (req: Request): string => req.workerId ?? '';

  router.get('/my/savings-goal', requireWorker, async (req, res) => {
    res.json({ goal: await service.get(workerId(req)) });
  });

  router.put('/my/savings-goal', requireWorker, async (req, res) => {
    const { targetAmount } = savingsGoalSchema.parse(req.body);
    res.json({ goal: await service.set(workerId(req), targetAmount) });
  });

  router.delete('/my/savings-goal', requireWorker, async (req, res) => {
    await service.clear(workerId(req));
    res.status(204).end();
  });

  return router;
}
