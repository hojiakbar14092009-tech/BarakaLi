import type { RequestHandler } from 'express';
import type { UserRole } from '@barakali/shared';
import type { AppContext } from '../context.js';
import { AppError } from '../errors.js';
import { verifyAccessToken } from '../modules/auth/tokens.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: { userId: string; role: UserRole };
      /** Set when the bearer token belongs to a blocked account. */
      blocked?: boolean;
      workerId?: string;
    }
  }
}

export interface AuthMiddleware {
  /** Attaches `req.auth` when a valid bearer token is present; never rejects. */
  optionalAuth: RequestHandler;
  requireAuth: RequestHandler;
  /** Requires a signed-in user who owns a worker profile; sets `req.workerId`. */
  requireWorker: RequestHandler;
  requireAdmin: RequestHandler;
}

function readBearer(header: string | undefined): string | undefined {
  if (!header?.startsWith('Bearer ')) return undefined;
  return header.slice('Bearer '.length).trim() || undefined;
}

export function createAuthMiddleware(ctx: AppContext): AuthMiddleware {
  // A stateless token stays valid until it expires, so a block is checked on every request.
  const optionalAuth: RequestHandler = (req, _res, next) => {
    const token = readBearer(req.get('authorization'));
    const claims = token ? verifyAccessToken(token, ctx.config.jwtAccessSecret) : null;
    if (!claims) return next();
    ctx.db
      .selectFrom('users')
      .select('blocked_at')
      .where('id', '=', claims.userId)
      .executeTakeFirst()
      .then((row) => {
        if (row?.blocked_at) req.blocked = true;
        else req.auth = claims;
        next();
      }, next);
  };

  const requireAuth: RequestHandler = (req, _res, next) => {
    optionalAuth(req, _res, (error?: unknown) => {
      if (error) return next(error);
      if (req.blocked) return next(new AppError('USER_BLOCKED', 403));
      return next(req.auth ? undefined : AppError.unauthenticated());
    });
  };

  const requireWorker: RequestHandler = (req, res, next) => {
    requireAuth(req, res, async (error?: unknown) => {
      if (error) return next(error);
      const row = await ctx.db
        .selectFrom('workers')
        .select('id')
        .where('user_id', '=', req.auth?.userId ?? '')
        .executeTakeFirst();
      if (!row) return next(new AppError('WORKER_REQUIRED', 403));
      req.workerId = row.id;
      return next();
    });
  };

  const requireAdmin: RequestHandler = (req, res, next) => {
    requireAuth(req, res, (error?: unknown) => {
      if (error) return next(error);
      return next(req.auth?.role === 'admin' ? undefined : AppError.forbidden());
    });
  };

  return { optionalAuth, requireAuth, requireWorker, requireAdmin };
}
