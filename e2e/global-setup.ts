import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { request } from '@playwright/test';
import { ADMIN_AUTH_FILE, ADMIN_PHONE } from './helpers';

const ORIGIN = 'http://localhost:4173';

/**
 * Signs the administrator in exactly once before any test file runs, and writes the resulting
 * `{ accessToken, user }` (the same shape `/auth/verify` and `/auth/refresh` return) to
 * ADMIN_AUTH_FILE. Specs give a browser context an admin session by mocking `/auth/refresh` to
 * return this cached response (see `loginAsAdmin` in helpers.ts) instead of signing in for real:
 * refresh tokens are rotated on every use, so a cookie captured once could only ever authenticate
 * one page load, and each spec file is its own module instance, so an in-module cache cannot be
 * shared between files either way. Reusing one access token sidesteps both: it is a stateless JWT
 * that stays valid for its own lifetime no matter how many pages "refresh" with it.
 */
export default async function globalSetup(): Promise<void> {
  const api = await request.newContext({ baseURL: ORIGIN, extraHTTPHeaders: { Origin: ORIGIN } });
  try {
    const codeRes = await api.post('/api/auth/request-code', { data: { phone: ADMIN_PHONE } });
    if (!codeRes.ok()) {
      throw new Error(`Global setup: admin request-code failed with ${codeRes.status()}`);
    }
    const { code } = (await codeRes.json()) as { code: string };
    const verify = await api.post('/api/auth/verify', {
      data: { phone: ADMIN_PHONE, code, name: 'Admin' },
    });
    if (!verify.ok()) {
      throw new Error(`Global setup: admin sign-in failed with ${verify.status()}`);
    }
    mkdirSync(dirname(ADMIN_AUTH_FILE), { recursive: true });
    writeFileSync(ADMIN_AUTH_FILE, await verify.text(), 'utf8');
  } finally {
    await api.dispose();
  }
}
