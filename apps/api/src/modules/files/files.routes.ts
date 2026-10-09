import { Router } from 'express';
import type { AppContext } from '../../context.js';
import { AppError } from '../../errors.js';

const FILE_NAME_PATTERN = /^[a-f0-9-]{36}\.(webp|glb)$/;
const ONE_YEAR_SECONDS = 31_536_000;

export function createFilesRouter(ctx: AppContext): Router {
  const router = Router();

  router.get('/files/:name', async (req, res) => {
    const name = req.params.name ?? '';
    if (!FILE_NAME_PATTERN.test(name)) throw AppError.notFound();
    const file = await ctx.storage.get(name);
    if (!file) throw AppError.notFound();
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Length', file.data.length);
    res.setHeader('Cache-Control', `public, max-age=${ONE_YEAR_SECONDS}, immutable`);
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.send(file.data);
  });

  return router;
}
