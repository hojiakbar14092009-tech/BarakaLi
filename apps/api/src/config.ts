import { z } from 'zod';
import { normalizePhone } from '@barakali/shared';

const DEV_ACCESS_SECRET = 'dev-only-access-secret-change-me-0000';
const DEV_REFRESH_SECRET = 'dev-only-refresh-secret-change-me-000';

const booleanString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(32).optional(),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  ADMIN_PHONES: z
    .string()
    .default('')
    .transform(splitList)
    .pipe(
      z.array(
        z.string().transform((value, ctx) => {
          const phone = normalizePhone(value);
          if (!phone)
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'ADMIN_PHONES must hold +998 numbers',
            });
          return phone ?? '';
        }),
      ),
    ),
  ADMIN_NAME: z.string().trim().min(1).default('Hojiakbar'),
  SMS_PROVIDER: z.enum(['console']).default('console'),
  EXPOSE_SMS_CODE: booleanString,
  SEED_SAMPLE_DATA: booleanString,
  PAYMENT_PROVIDER: z.enum(['internal', 'payme', 'click', 'uzum']).default('internal'),
  STORAGE_PROVIDER: z.enum(['db']).default('db'),
});

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  isProduction: boolean;
  port: number;
  allowedOrigins: string[];
  databaseUrl: string | undefined;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  adminPhones: string[];
  adminName: string;
  smsProvider: 'console';
  exposeSmsCode: boolean;
  seedSampleData: boolean;
  paymentProvider: 'internal' | 'payme' | 'click' | 'uzum';
  storageProvider: 'db';
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse(env);
  const isProduction = parsed.NODE_ENV === 'production';
  if (isProduction && (!parsed.JWT_ACCESS_SECRET || !parsed.JWT_REFRESH_SECRET)) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are required in production');
  }
  if (isProduction && !parsed.DATABASE_URL) {
    throw new Error('DATABASE_URL is required in production');
  }
  return {
    nodeEnv: parsed.NODE_ENV,
    isProduction,
    port: parsed.PORT,
    allowedOrigins: splitList(parsed.ALLOWED_ORIGINS),
    databaseUrl: parsed.DATABASE_URL || undefined,
    jwtAccessSecret: parsed.JWT_ACCESS_SECRET ?? DEV_ACCESS_SECRET,
    jwtRefreshSecret: parsed.JWT_REFRESH_SECRET ?? DEV_REFRESH_SECRET,
    adminPhones: parsed.ADMIN_PHONES,
    adminName: parsed.ADMIN_NAME,
    smsProvider: parsed.SMS_PROVIDER,
    exposeSmsCode: parsed.EXPOSE_SMS_CODE,
    seedSampleData: parsed.SEED_SAMPLE_DATA,
    paymentProvider: parsed.PAYMENT_PROVIDER,
    storageProvider: parsed.STORAGE_PROVIDER,
  };
}
