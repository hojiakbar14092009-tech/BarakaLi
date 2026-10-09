import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import type { ApiErrorBody, ErrorCode } from '@barakali/shared';
import { logger } from './logger.js';

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly status: number,
    public readonly details?: Record<string, string[]>,
  ) {
    super(code);
    this.name = 'AppError';
  }

  static validation(details?: Record<string, string[]>): AppError {
    return new AppError('VALIDATION_ERROR', 400, details);
  }
  static unauthenticated(): AppError {
    return new AppError('UNAUTHENTICATED', 401);
  }
  static forbidden(): AppError {
    return new AppError('FORBIDDEN', 403);
  }
  static notFound(code: ErrorCode = 'NOT_FOUND'): AppError {
    return new AppError(code, 404);
  }
  static conflict(code: ErrorCode): AppError {
    return new AppError(code, 409);
  }
  static badRequest(code: ErrorCode): AppError {
    return new AppError(code, 400);
  }
}

function zodDetails(error: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    (details[key] ??= []).push(issue.message);
  }
  return details;
}

function isBodyTooLarge(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { type?: string }).type === 'entity.too.large'
  );
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(AppError.notFound());
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof ZodError) {
    const body: ApiErrorBody = { error: { code: 'VALIDATION_ERROR', details: zodDetails(error) } };
    res.status(400).json(body);
    return;
  }
  if (error instanceof AppError) {
    const body: ApiErrorBody = { error: { code: error.code, details: error.details } };
    res.status(error.status).json(body);
    return;
  }
  if (isBodyTooLarge(error)) {
    res.status(413).json({ error: { code: 'VALIDATION_ERROR' } } satisfies ApiErrorBody);
    return;
  }
  logger.error('Unhandled error', {
    method: req.method,
    path: req.path,
    message: error instanceof Error ? error.message : 'unknown',
    stack: error instanceof Error ? error.stack : undefined,
  });
  res.status(500).json({ error: { code: 'INTERNAL_ERROR' } } satisfies ApiErrorBody);
};
