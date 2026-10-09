import { Router, type Request } from 'express';
import { z } from 'zod';
import { cardPaymentSchema, createOrdersSchema, orderActionSchema } from '@barakali/shared';
import type { AppContext } from '../../context.js';
import { AppError } from '../../errors.js';
import { createAuthMiddleware } from '../../middleware/auth.js';
import { WorkersRepository } from '../workers/workers.repository.js';
import { PaymentService } from '../payments/payment.service.js';
import type { OrderViewer } from './order.repository.js';
import { OrderService } from './order.service.js';

const idSchema = z.string().uuid();
const listQuery = z.object({ as: z.enum(['customer', 'worker']).default('customer') });

function orderId(req: Request): string {
  const parsed = idSchema.safeParse(req.params.id);
  if (!parsed.success) throw AppError.notFound();
  return parsed.data;
}

export function createOrderRouter(ctx: AppContext): Router {
  const router = Router();
  const orders = new OrderService(ctx);
  const payments = new PaymentService(ctx);
  const workers = new WorkersRepository(ctx.db);
  const { requireAuth, requireWorker } = createAuthMiddleware(ctx);

  const viewerOf = async (req: Request): Promise<OrderViewer> => {
    const userId = req.auth?.userId ?? '';
    return { userId, workerId: await workers.findIdByUser(userId) };
  };

  router.post('/orders', requireAuth, async (req, res) => {
    const input = createOrdersSchema.parse(req.body);
    res.status(201).json(await orders.createOrders(req.auth?.userId ?? '', input));
  });

  router.get('/orders', requireAuth, async (req, res) => {
    const { as } = listQuery.parse(req.query);
    res.json(await orders.list(await viewerOf(req), as));
  });

  router.get('/orders/:id', requireAuth, async (req, res) => {
    res.json(await orders.get(await viewerOf(req), orderId(req)));
  });

  router.post('/orders/:id/actions', requireWorker, async (req, res) => {
    const { action } = orderActionSchema.parse(req.body);
    res.json(await orders.act(await viewerOf(req), orderId(req), action));
  });

  router.post('/orders/:id/payment', requireAuth, async (req, res) => {
    res.json(await payments.start(req.auth?.userId ?? '', orderId(req)));
  });

  router.post('/orders/:id/payment/confirm', requireAuth, async (req, res) => {
    const card = cardPaymentSchema.parse(req.body);
    res.json(await payments.confirm(req.auth?.userId ?? '', orderId(req), card));
  });

  router.get('/earnings', requireWorker, async (req, res) => {
    res.json(await orders.earnings(req.workerId ?? ''));
  });

  return router;
}
