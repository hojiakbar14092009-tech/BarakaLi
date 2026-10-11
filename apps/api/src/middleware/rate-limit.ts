import type { Request, RequestHandler } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import type { ApiErrorBody } from '@barakali/shared';

const WINDOW_MS = 15 * 60 * 1000;

const rateLimitedBody: ApiErrorBody = { error: { code: 'RATE_LIMITED' } };

function limiter(limit: number, keyGenerator?: (req: Request) => string): RequestHandler {
  return rateLimit({
    windowMs: WINDOW_MS,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: rateLimitedBody,
    keyGenerator: keyGenerator ?? ((req) => ipKeyGenerator(req.ip ?? '')),
    validate: { trustProxy: false, xForwardedForHeader: false },
  });
}

export const generalLimiter = (enabled: boolean): RequestHandler =>
  enabled ? limiter(600) : (_req, _res, next) => next();

export const authLimiter = (enabled: boolean): RequestHandler =>
  enabled ? limiter(30) : (_req, _res, next) => next();

/**
 * Stricter limit for phone sign-in, keyed by phone and IP: with no SMS code, this is what slows
 * down someone trying numbers.
 */
export const loginLimiter = (enabled: boolean): RequestHandler =>
  enabled
    ? limiter(8, (req) => {
        const phone = typeof req.body?.phone === 'string' ? req.body.phone : '';
        return `${ipKeyGenerator(req.ip ?? '')}|${phone.replace(/\D/g, '')}`;
      })
    : (_req, _res, next) => next();
