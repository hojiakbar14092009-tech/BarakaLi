import { Router, type Request } from 'express';
import {
  adminListQuerySchema,
  complaintResolutionSchema,
  materialInputSchema,
  reviewModerationSchema,
  workerRejectionSchema,
} from '@barakali/shared';
import type { AppContext } from '../../context.js';
import { AppError } from '../../errors.js';
import { createAuthMiddleware } from '../../middleware/auth.js';
import { MaterialService } from '../materials/material.service.js';
import { AdminService } from './admin.service.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function idParam(req: Request): string {
  const value = req.params.id;
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw AppError.notFound();
  return value;
}

/** Every route below is admin-only; the role comes from the verified token, never from the client. */
export function createAdminRouter(ctx: AppContext): Router {
  const router = Router();
  const admin = new AdminService(ctx);
  const materials = new MaterialService(ctx);
  const { requireAdmin } = createAuthMiddleware(ctx);

  router.use('/admin', requireAdmin);

  router.get('/admin/stats', async (_req, res) => {
    res.json(await admin.stats());
  });

  router.get('/admin/workers', async (req, res) => {
    res.json(await admin.listWorkers(adminListQuerySchema.parse(req.query)));
  });

  router.post('/admin/workers/:id/approve', async (req, res) => {
    await admin.approveWorker(req.auth?.userId ?? '', idParam(req));
    res.status(204).end();
  });

  router.post('/admin/workers/:id/reject', async (req, res) => {
    const { reason } = workerRejectionSchema.parse(req.body);
    await admin.rejectWorker(req.auth?.userId ?? '', idParam(req), reason);
    res.status(204).end();
  });

  router.get('/admin/orders', async (req, res) => {
    res.json(await admin.listOrders(adminListQuerySchema.parse(req.query)));
  });

  router.post('/admin/orders/:id/refund', async (req, res) => {
    await admin.refundOrder(idParam(req));
    res.status(204).end();
  });

  router.get('/admin/reviews', async (req, res) => {
    res.json(await admin.listReviews(adminListQuerySchema.parse(req.query)));
  });

  router.patch('/admin/reviews/:id', async (req, res) => {
    const { status } = reviewModerationSchema.parse(req.body);
    await admin.setReviewStatus(idParam(req), status);
    res.status(204).end();
  });

  router.get('/admin/complaints', async (req, res) => {
    res.json(await admin.listComplaints(adminListQuerySchema.parse(req.query)));
  });

  router.patch('/admin/complaints/:id', async (req, res) => {
    const { status } = complaintResolutionSchema.parse(req.body);
    await admin.resolveComplaint(idParam(req), status);
    res.status(204).end();
  });

  router.get('/admin/materials', async (_req, res) => {
    res.json(await materials.listAll());
  });

  router.post('/admin/materials', async (req, res) => {
    res.status(201).json(await materials.create(materialInputSchema.parse(req.body)));
  });

  router.put('/admin/materials/:id', async (req, res) => {
    res.json(await materials.update(idParam(req), materialInputSchema.parse(req.body)));
  });

  router.get('/admin/material-orders', async (_req, res) => {
    res.json(await materials.adminList());
  });

  router.post('/admin/material-orders/:id/deliver', async (req, res) => {
    await materials.markDelivered(idParam(req));
    res.status(204).end();
  });

  return router;
}
