import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { loadConfig, type AppConfig } from './config.js';
import { errorHandler, notFoundHandler } from './errors.js';
import { originGuard } from './middleware/origin.js';

export interface AppOptions {
  config?: AppConfig;
}

export function createApp(options: AppOptions = {}): Express {
  const config = options.config ?? loadConfig();
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(cors({ origin: config.allowedOrigins, credentials: true }));
  app.use(originGuard(config.allowedOrigins));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  const api = express.Router();
  api.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
