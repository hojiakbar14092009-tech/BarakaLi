import type { Request, RequestHandler } from 'express';
import multer, { MulterError } from 'multer';
import type { ErrorCode } from '@barakali/shared';
import { AppError } from '../errors.js';

/** Parses one in-memory file and maps multer failures to coded API errors. */
export function singleFile(field: string, maxBytes: number, tooLarge: ErrorCode): RequestHandler {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1 },
  });
  return (req, res, next) => {
    upload.single(field)(req, res, (error?: unknown) => {
      if (error instanceof MulterError) {
        return next(
          error.code === 'LIMIT_FILE_SIZE'
            ? new AppError(tooLarge, 413)
            : AppError.badRequest('UPLOAD_MISSING_FILE'),
        );
      }
      return next(error);
    });
  };
}

export function fileOf(req: Request): Buffer {
  if (!req.file) throw AppError.badRequest('UPLOAD_MISSING_FILE');
  return req.file.buffer;
}
