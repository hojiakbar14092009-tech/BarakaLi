import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { request } from '@playwright/test';
import { ADMIN_AUTH_FILE, ADMIN_PHONE } from './helpers';

const ORIGIN = 'http://localhost:4173';

/**
 * Signs the administrator in exactly once before any test file runs, and writes the resulting
 * `{ accessToken, user }` (the same shape `/auth/login` and `/auth/refresh` return) to
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
    const res = await api.post('/api/auth/admin/login', { data: { phone: ADMIN_PHONE } });
    if (!res.ok()) {
      throw new Error(`Global setup: admin sign-in failed with ${res.status()}`);
    }
    mkdirSync(dirname(ADMIN_AUTH_FILE), { recursive: true });
    writeFileSync(ADMIN_AUTH_FILE, await res.text(), 'utf8');
  } finally {
    await api.dispose();
  }
}
