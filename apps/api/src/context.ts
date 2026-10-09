import type { AppConfig } from './config.js';
import type { Db } from './db/client.js';
import type { Cache } from './infra/cache.js';
import type { SmsProvider } from './infra/sms.js';
import type { StorageProvider } from './infra/storage.js';
import type { PaymentProvider } from './modules/payments/payment-provider.js';

export interface AppContext {
  config: AppConfig;
  db: Db;
  cache: Cache;
  storage: StorageProvider;
  sms: SmsProvider;
  payments: PaymentProvider;
}
