import type { RequestHandler } from 'express';
import { AppError } from '../errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Rejects state-changing requests that come from a foreign Origin. */
export function originGuard(allowedOrigins: string[]): RequestHandler {
  return (req, _res, next) => {
    const origin = req.get('origin');
    if (SAFE_METHODS.has(req.method) || !origin) return next();
    const host = req.get('x-forwarded-host') ?? req.get('host');
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      return next(AppError.forbidden());
    }
    if (originHost === host || allowedOrigins.includes(origin)) return next();
    return next(AppError.forbidden());
  };
}
