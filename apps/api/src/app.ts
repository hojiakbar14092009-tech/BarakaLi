import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express, type RequestHandler } from 'express';
import helmet from 'helmet';
import { loadConfig, type AppConfig } from './config.js';
import type { AppContext } from './context.js';
import type { Db } from './db/client.js';
import { errorHandler, notFoundHandler } from './errors.js';
import { MemoryCache, type Cache } from './infra/cache.js';
import { ConsoleSmsProvider, type SmsProvider } from './infra/sms.js';
import { DbStorageProvider, type StorageProvider } from './infra/storage.js';
import { logger } from './logger.js';
import { originGuard } from './middleware/origin.js';
import { generalLimiter } from './middleware/rate-limit.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createCatalogRouter } from './modules/catalog/catalog.routes.js';
import { createFeedbackRouter } from './modules/feedback/feedback.routes.js';
import { createFilesRouter } from './modules/files/files.routes.js';
import { createOrderRouter } from './modules/orders/order.routes.js';
import { createPaymentProvider } from './modules/payments/provider-factory.js';
import type { PaymentProvider } from './modules/payments/payment-provider.js';
import { createProductRouter } from './modules/products/product.routes.js';

export interface AppOptions {
  db: Db;
  config?: AppConfig;
  cache?: Cache;
  storage?: StorageProvider;
  sms?: SmsProvider;
  payments?: PaymentProvider;
  /** Requests wait for this to resolve (e.g. migrations on a serverless cold start). */
  ready?: () => Promise<unknown>;
}

export function buildContext(options: AppOptions): AppContext {
  const config = options.config ?? loadConfig();
  return {
    config,
    db: options.db,
    cache: options.cache ?? new MemoryCache(),
    storage: options.storage ?? new DbStorageProvider(options.db),
    sms: options.sms ?? new ConsoleSmsProvider(config.nodeEnv === 'development'),
    payments: options.payments ?? createPaymentProvider(config),
  };
}

function waitFor(ready: AppOptions['ready']): RequestHandler {
  return (_req, _res, next) => {
    if (!ready) return next();
    ready().then(() => next(), next);
  };
}

export function createApp(options: AppOptions): Express {
  const ctx = buildContext(options);
  const { config } = ctx;
  if (config.isProduction && ctx.payments.name === 'internal') {
    logger.warn('Real payment provider is not connected: PAYMENT_PROVIDER=internal');
  }
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
  api.use(waitFor(options.ready));
  api.use(generalLimiter(config.nodeEnv !== 'test'));
  api.use(createAuthRouter(ctx));
  api.use(createCatalogRouter(ctx));
  api.use(createProductRouter(ctx));
  api.use(createOrderRouter(ctx));
  api.use(createFeedbackRouter(ctx));
  api.use(createFilesRouter(ctx));
  app.use('/api', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
