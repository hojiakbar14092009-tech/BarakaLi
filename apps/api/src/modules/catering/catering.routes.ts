import { cateringRequestSchema } from '@barakali/shared';
import { Router } from 'express';
import type { AppContext } from '../../context.js';
import { cateringLimiter } from '../../middleware/rate-limit.js';
import { CateringService } from './catering.service.js';

export function createCateringRouter(ctx: AppContext): Router {
  const router = Router();
  const catering = new CateringService(ctx);
  const limited = ctx.config.nodeEnv !== 'test';

  // Only the new id goes back: the phone and the rest of the enquiry are never echoed.
  router.post('/catering-requests', cateringLimiter(limited), async (req, res) => {
    const input = cateringRequestSchema.parse(req.body);
    res.status(201).json(await catering.createRequest(input));
  });

  return router;
}
