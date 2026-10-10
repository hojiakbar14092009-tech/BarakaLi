import { Router, type Request } from 'express';
import {
  MAX_IMAGE_BYTES,
  MAX_MODEL_BYTES,
  productInputSchema,
  productStatusSchema,
  stockUpdateSchema,
} from '@barakali/shared';
import type { AppContext } from '../../context.js';
import { AppError } from '../../errors.js';
import { createAuthMiddleware } from '../../middleware/auth.js';
import { fileOf, singleFile } from '../../middleware/upload.js';
import { ProductService } from './product.service.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function idParam(req: Request, name = 'id'): string {
  const value = req.params[name];
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw AppError.notFound();
  return value;
}

export function createProductRouter(ctx: AppContext): Router {
  const router = Router();
  const service = new ProductService(ctx);
  const { requireWorker } = createAuthMiddleware(ctx);
  const workerId = (req: Request): string => req.workerId ?? '';

  router.use('/my/products', requireWorker);

  router.get('/my/products', async (req, res) => {
    res.json(await service.listMine(workerId(req)));
  });

  router.post('/my/products', async (req, res) => {
    const input = productInputSchema.parse(req.body);
    res.status(201).json(await service.create(workerId(req), input));
  });

  router.put('/my/products/:id', async (req, res) => {
    const input = productInputSchema.parse(req.body);
    res.json(await service.update(workerId(req), idParam(req), input));
  });

  router.patch('/my/products/:id/stock', async (req, res) => {
    const { stock } = stockUpdateSchema.parse(req.body);
    res.json(await service.setStock(workerId(req), idParam(req), stock));
  });

  router.patch('/my/products/:id/status', async (req, res) => {
    const { status } = productStatusSchema.parse(req.body);
    res.json(await service.setStatus(workerId(req), idParam(req), status));
  });

  router.delete('/my/products/:id', async (req, res) => {
    await service.remove(workerId(req), idParam(req));
    res.status(204).end();
  });

  router.post(
    '/my/products/:id/images',
    singleFile('image', MAX_IMAGE_BYTES, 'IMAGE_TOO_LARGE'),
    async (req, res) => {
      res.status(201).json(await service.addImage(workerId(req), idParam(req), fileOf(req)));
    },
  );

  router.delete('/my/products/:id/images/:imageId', async (req, res) => {
    res.json(await service.removeImage(workerId(req), idParam(req), idParam(req, 'imageId')));
  });

  router.put(
    '/my/products/:id/model',
    singleFile('model', MAX_MODEL_BYTES, 'MODEL_TOO_LARGE'),
    async (req, res) => {
      res.json(await service.setModel(workerId(req), idParam(req), fileOf(req)));
    },
  );

  router.delete('/my/products/:id/model', async (req, res) => {
    res.json(await service.removeModel(workerId(req), idParam(req)));
  });

  return router;
}
