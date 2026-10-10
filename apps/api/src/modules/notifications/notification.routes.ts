import { Router, type Request } from 'express';
import type { AppContext } from '../../context.js';
import { AppError } from '../../errors.js';
import { createAuthMiddleware } from '../../middleware/auth.js';
import { NotificationService } from './notification.service.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function orderIdParam(req: Request): string {
  const value = req.params.orderId;
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw AppError.notFound();
  return value;
}

export function createNotificationRouter(ctx: AppContext): Router {
  const router = Router();
  const service = new NotificationService(ctx);
  const { requireAuth } = createAuthMiddleware(ctx);
  const userId = (req: Request): string => req.auth?.userId ?? '';

  router.get('/my/notifications', requireAuth, async (req, res) => {
    res.json(await service.list(userId(req)));
  });

  router.post('/my/notifications/read', requireAuth, async (req, res) => {
    await service.markAllRead(userId(req));
    res.status(204).end();
  });

  router.post('/my/notifications/orders/:orderId/read', requireAuth, async (req, res) => {
    await service.markOrderRead(userId(req), orderIdParam(req));
    res.status(204).end();
  });

  return router;
}
