import { Router, type Response } from 'express';
import {
  becomeWorkerSchema,
  requestCodeSchema,
  updateProfileSchema,
  verifyCodeSchema,
  workerProfileSchema,
} from '@barakali/shared';
import type { AppContext } from '../../context.js';
import { createAuthMiddleware } from '../../middleware/auth.js';
import { authLimiter, smsLimiter } from '../../middleware/rate-limit.js';
import { WorkersService } from '../workers/workers.service.js';
import { AuthService, type IssuedSession } from './auth.service.js';

const REFRESH_COOKIE = 'barakali_rt';
const REFRESH_COOKIE_PATH = '/api/auth';

function setRefreshCookie(res: Response, session: IssuedSession, secure: boolean): void {
  res.cookie(REFRESH_COOKIE, session.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
    expires: session.refreshExpiresAt,
  });
}

export function createAuthRouter(ctx: AppContext): Router {
  const router = Router();
  const auth = new AuthService(ctx);
  const workers = new WorkersService(ctx);
  const { requireAuth, requireWorker } = createAuthMiddleware(ctx);
  const limited = ctx.config.nodeEnv !== 'test';

  router.post('/auth/request-code', smsLimiter(limited), async (req, res) => {
    const { phone } = requestCodeSchema.parse(req.body);
    res.json(await auth.requestCode(phone));
  });

  router.post('/auth/admin/request-code', smsLimiter(limited), async (req, res) => {
    const { phone } = requestCodeSchema.parse(req.body);
    res.json(await auth.requestAdminCode(phone));
  });

  router.post('/auth/verify', authLimiter(limited), async (req, res) => {
    const session = await auth.verifyCode(verifyCodeSchema.parse(req.body));
    setRefreshCookie(res, session, ctx.config.isProduction);
    res.json(session.response);
  });

  router.post('/auth/refresh', authLimiter(limited), async (req, res) => {
    const session = await auth.refresh(req.cookies?.[REFRESH_COOKIE]);
    setRefreshCookie(res, session, ctx.config.isProduction);
    res.json(session.response);
  });

  router.post('/auth/logout', async (req, res) => {
    await auth.logout(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
    res.status(204).end();
  });

  router.get('/me', requireAuth, async (req, res) => {
    res.json(await auth.getUser(req.auth?.userId ?? ''));
  });

  router.patch('/me', requireAuth, async (req, res) => {
    const input = updateProfileSchema.parse(req.body);
    res.json(await auth.updateProfile(req.auth?.userId ?? '', input.name, input.language));
  });

  router.post('/me/worker', requireAuth, async (req, res) => {
    const input = becomeWorkerSchema.parse(req.body);
    await workers.becomeWorker(req.auth?.userId ?? '', input);
    res.status(201).json(await auth.getUser(req.auth?.userId ?? ''));
  });

  router.patch('/me/worker', requireWorker, async (req, res) => {
    const input = workerProfileSchema.parse(req.body);
    await workers.setTelegramUsername(req.auth?.userId ?? '', input.telegramUsername);
    res.json(await auth.getUser(req.auth?.userId ?? ''));
  });

  return router;
}
