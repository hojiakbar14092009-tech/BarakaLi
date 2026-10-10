import { Router } from 'express';
import { z } from 'zod';
import { listQuerySchema } from '@barakali/shared';
import type { AppContext } from '../../context.js';
import { AppError } from '../../errors.js';
import { createAuthMiddleware } from '../../middleware/auth.js';
import { ReviewsReader } from '../workers/reviews.service.js';
import { WorkersRepository } from '../workers/workers.repository.js';
import { WorkersService } from '../workers/workers.service.js';
import { CatalogService } from './catalog.service.js';

const pageQuery = z.object({ page: z.coerce.number().int().min(1).default(1) });

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requireUuid(value: unknown, code: 'NOT_FOUND' | 'PRODUCT_NOT_FOUND'): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw AppError.notFound(code);
  return value;
}

export function createCatalogRouter(ctx: AppContext): Router {
  const router = Router();
  const catalog = new CatalogService(ctx);
  const workers = new WorkersService(ctx);
  const workersRepo = new WorkersRepository(ctx.db);
  const reviews = new ReviewsReader(ctx.db);
  const { optionalAuth } = createAuthMiddleware(ctx);

  router.get('/categories', async (_req, res) => {
    res.json(await catalog.categories());
  });

  router.get('/workers/featured', async (_req, res) => {
    res.json(await workers.featured());
  });

  router.get('/workers/:id', async (req, res) => {
    res.json(await workers.getById(requireUuid(req.params.id, 'NOT_FOUND')));
  });

  router.get('/workers/:id/reviews', async (req, res) => {
    const id = requireUuid(req.params.id, 'NOT_FOUND');
    if (!(await workersRepo.findById(id))) throw AppError.notFound();
    const { page } = pageQuery.parse(req.query);
    res.json(await reviews.listVisible(id, page));
  });

  router.get('/products', async (req, res) => {
    res.json(await catalog.listProducts(listQuerySchema.parse(req.query)));
  });

  router.get('/products/:id', optionalAuth, async (req, res) => {
    const id = requireUuid(req.params.id, 'PRODUCT_NOT_FOUND');
    const viewerWorkerId = req.auth ? await workersRepo.findIdByUser(req.auth.userId) : undefined;
    res.json(await catalog.getProduct(id, viewerWorkerId));
  });

  return router;
}
