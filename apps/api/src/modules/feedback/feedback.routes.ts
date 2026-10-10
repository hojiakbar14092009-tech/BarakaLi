import { Router, type Request } from 'express';
import { z } from 'zod';
import { complaintInputSchema, reviewInputSchema } from '@barakali/shared';
import type { AppContext } from '../../context.js';
import { AppError } from '../../errors.js';
import { createAuthMiddleware } from '../../middleware/auth.js';
import { FeedbackService } from './feedback.service.js';

const idSchema = z.string().uuid();

function orderId(req: Request): string {
  const parsed = idSchema.safeParse(req.params.id);
  if (!parsed.success) throw AppError.notFound();
  return parsed.data;
}

export function createFeedbackRouter(ctx: AppContext): Router {
  const router = Router();
  const feedback = new FeedbackService(ctx);
  const { requireAuth } = createAuthMiddleware(ctx);

  router.post('/orders/:id/review', requireAuth, async (req, res) => {
    const input = reviewInputSchema.parse(req.body);
    res.status(201).json(await feedback.createReview(req.auth?.userId ?? '', orderId(req), input));
  });

  router.post('/orders/:id/complaint', requireAuth, async (req, res) => {
    const input = complaintInputSchema.parse(req.body);
    res
      .status(201)
      .json(await feedback.createComplaint(req.auth?.userId ?? '', orderId(req), input));
  });

  return router;
}
