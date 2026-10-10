import { Router, type Request } from 'express';
import {
  adminListQuerySchema,
  adminOrderStatusSchema,
  adminProductUpdateSchema,
  refundRequestSchema,
  userBlockSchema,
} from '@barakali/shared';
import type { AppContext } from '../../context.js';
import { AppError } from '../../errors.js';
import { createAuthMiddleware } from '../../middleware/auth.js';
import { AdminOrdersService } from './admin-orders.service.js';
import { AdminProductsService } from './admin-products.service.js';
import { AdminUsersService } from './admin-users.service.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function idParam(req: Request): string {
  const value = req.params.id;
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw AppError.notFound();
  return value;
}

/** Products, orders and users management; every route is behind requireAdmin. */
export function createAdminManagementRouter(ctx: AppContext): Router {
  const router = Router();
  const products = new AdminProductsService(ctx);
  const orders = new AdminOrdersService(ctx);
  const users = new AdminUsersService(ctx);
  const { requireAdmin } = createAuthMiddleware(ctx);
  const adminId = (req: Request) => req.auth?.userId ?? '';

  router.use('/admin', requireAdmin);

  router.get('/admin/products', async (req, res) => {
    res.json(await products.list(adminListQuerySchema.parse(req.query)));
  });
  router.patch('/admin/products/:id', async (req, res) => {
    await products.update(adminId(req), idParam(req), adminProductUpdateSchema.parse(req.body));
    res.status(204).end();
  });
  router.post('/admin/products/:id/hide', async (req, res) => {
    await products.setVisible(adminId(req), idParam(req), false);
    res.status(204).end();
  });
  router.post('/admin/products/:id/show', async (req, res) => {
    await products.setVisible(adminId(req), idParam(req), true);
    res.status(204).end();
  });
  router.delete('/admin/products/:id', async (req, res) => {
    await products.remove(adminId(req), idParam(req));
    res.status(204).end();
  });

  router.get('/admin/orders/:id', async (req, res) => {
    res.json(await orders.get(idParam(req)));
  });
  router.patch('/admin/orders/:id/status', async (req, res) => {
    const { status } = adminOrderStatusSchema.parse(req.body);
    await orders.setStatus(adminId(req), idParam(req), status);
    res.status(204).end();
  });
  router.post('/admin/orders/:id/refund', async (req, res) => {
    const { reason } = refundRequestSchema.parse(req.body ?? {});
    res.status(201).json(await orders.refund(adminId(req), idParam(req), reason));
  });

  router.get('/admin/users', async (req, res) => {
    res.json(await users.list(adminListQuerySchema.parse(req.query)));
  });
  router.get('/admin/users/:id', async (req, res) => {
    res.json(await users.get(idParam(req)));
  });
  router.post('/admin/users/:id/block', async (req, res) => {
    const { reason } = userBlockSchema.parse(req.body);
    await users.setBlocked(adminId(req), idParam(req), reason, true);
    res.status(204).end();
  });
  router.post('/admin/users/:id/unblock', async (req, res) => {
    await users.setBlocked(adminId(req), idParam(req), null, false);
    res.status(204).end();
  });

  return router;
}
