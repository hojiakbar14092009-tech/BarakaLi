import { readFileSync } from 'node:fs';
import { expect, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';

export const VIEWPORTS = [
  { name: 'phone', width: 360, height: 800 },
  { name: 'phone-large', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
] as const;

/** Listed in ADMIN_PHONES of the browser-test API server (see playwright.config.ts). */
export const ADMIN_PHONE = '+998909990000';

export const CARD = { number: '4242 4242 4242 4242', expiry: '12/40', cvc: '123' };

let counter = Math.floor(Math.random() * 1_000_000);

export function freshPhone(): string {
  counter += 1;
  return `+99893${String(1_000_000 + (counter % 9_000_000))}`;
}

export interface Account {
  phone: string;
  token: string;
  userId: string;
}

/**
 * Signs in through the API on the browser context, so the refresh cookie lands in the page and
 * the app restores the session on load. Used where the sign-in form itself is not under test.
 */
export async function signIn(
  context: BrowserContext,
  name: string,
  phone = freshPhone(),
): Promise<Account> {
  const res = await context.request.post('/api/auth/login', { data: { phone, name } });
  expect(res.ok()).toBe(true);
  const body = (await res.json()) as { accessToken: string; user: { id: string } };
  return { phone, token: body.accessToken, userId: body.user.id };
}

const auth = (account: Account) => ({ Authorization: `Bearer ${account.token}` });

export async function firstCategoryId(request: APIRequestContext): Promise<string> {
  const res = await request.get('/api/categories');
  const categories = (await res.json()) as { id: string; slug: string }[];
  return categories[0]?.id ?? '';
}

const ORIGIN = 'http://localhost:4173';

/**
 * One real admin sign-in for the whole suite happens in global setup (see global-setup.ts), which
 * writes the resulting `{ accessToken, user }` here — the same shape `/auth/login` and
 * `/auth/refresh` return. Every spec file gets its own module instance, so a cache kept in this
 * file's own module state would not be shared between them, and each would spend its own entry
 * from the 5-per-15-minutes SMS code limit on ADMIN_PHONE if it signed in again; reading the same
 * on-disk session avoids that.
 */
export const ADMIN_AUTH_FILE = 'test-results/admin-auth.json';

function readAdminAuth(): { accessToken: string } {
  return JSON.parse(readFileSync(ADMIN_AUTH_FILE, 'utf8')) as { accessToken: string };
}

/** Approves a worker application as the administrator, through the public API. */
export async function approveWorker(workerId: string): Promise<void> {
  const res = await fetch(`${ORIGIN}/api/admin/workers/${workerId}/approve`, {
    method: 'POST',
    headers: { Origin: ORIGIN, Authorization: `Bearer ${readAdminAuth().accessToken}` },
  });
  expect(res.status).toBe(204);
}

/**
 * Logs a browser context in as the administrator without spending another sign-in: refresh tokens
 * rotate on every use, so a cookie captured once could only ever authenticate a single page load.
 * Instead, every `/auth/refresh` call in this context is answered with the cached admin session
 * from global setup — a stateless access token, good for its own lifetime no matter how many pages
 * "refresh" with it, exactly like the app's own restore-session flow would return on page load.
 */
export async function loginAsAdmin(context: BrowserContext): Promise<void> {
  const body = readFileSync(ADMIN_AUTH_FILE, 'utf8');
  await context.route('**/api/auth/refresh', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body }),
  );
}

/** Applies as a worker and gets approved, so the profile is public and can take orders. */
export async function becomeWorker(
  request: APIRequestContext,
  account: Account,
  displayName: string,
): Promise<string> {
  const res = await request.post('/api/me/worker', {
    headers: auth(account),
    data: { displayName, categoryId: await firstCategoryId(request) },
  });
  expect(res.ok()).toBe(true);
  const workerId = ((await res.json()) as { workerId: string }).workerId;
  await approveWorker(workerId);
  return workerId;
}

/** Adds a window that starts `daysAhead` days from now at a whole UTC hour. */
export async function addWindow(
  request: APIRequestContext,
  account: Account,
  daysAhead: number,
  hours = 6,
): Promise<{ startTime: string; endTime: string }> {
  const start = new Date(Date.now() + daysAhead * 86_400_000);
  start.setUTCHours(5, 0, 0, 0);
  const end = new Date(start.getTime() + hours * 3_600_000);
  const res = await request.post('/api/my/availability', {
    headers: auth(account),
    data: { startTime: start.toISOString(), endTime: end.toISOString() },
  });
  expect(res.ok()).toBe(true);
  return { startTime: start.toISOString(), endTime: end.toISOString() };
}

export async function publishedProductId(request: APIRequestContext): Promise<string> {
  const res = await request.get('/api/products?pageSize=1');
  const page = (await res.json()) as { items: { id: string }[] };
  const id = page.items[0]?.id;
  expect(id, 'sample data should provide a product').toBeTruthy();
  return id as string;
}

/** True when the page scrolls sideways, which must never happen on any supported width. */
export async function hasHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
}

const MIN_TOUCH_TARGET = 48;

/**
 * Visible buttons, links, inputs, selects and textareas shorter than `minPx` (default 48, the
 * platform's minimum touch target). Returns a short description of each offender so a failing
 * assertion says what to go fix, not just that something failed.
 */
export async function smallTouchTargets(page: Page, minPx = MIN_TOUCH_TARGET): Promise<string[]> {
  return page.evaluate((min) => {
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea'),
    );
    return targets
      .filter((el) => {
        const box = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        const visible = box.width > 0 && style.visibility !== 'hidden' && style.display !== 'none';
        const hiddenInput = el.classList.contains('sr-only');
        // Inline links inside sentences are covered by their own min-h class.
        return visible && !hiddenInput && box.height < min - 0.5;
      })
      .map((el) => `${el.tagName.toLowerCase()}:${(el.textContent ?? '').trim().slice(0, 30)}`);
  }, minPx);
}

// 1x1 PNG: enough for the server's image pipeline to accept a photo.
export const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

export interface ProductSeed {
  title: string;
  retailPrice: number;
  stock: number;
  wholesalePrice?: number;
  wholesaleMinQty?: number;
}

/** Creates a product with one photo and publishes it through the worker's own API. */
export async function createPublishedProduct(
  request: APIRequestContext,
  worker: Account,
  seed: ProductSeed,
): Promise<string> {
  const headers = auth(worker);
  const created = await request.post('/api/my/products', {
    headers,
    data: {
      title: seed.title,
      categoryId: await firstCategoryId(request),
      retailPrice: seed.retailPrice,
      wholesalePrice: seed.wholesalePrice ?? null,
      wholesaleMinQty: seed.wholesaleMinQty ?? null,
      stock: seed.stock,
    },
  });
  expect(created.ok()).toBe(true);
  const id = ((await created.json()) as { id: string }).id;
  const image = await request.post(`/api/my/products/${id}/images`, {
    headers,
    multipart: { image: { name: 'photo.png', mimeType: 'image/png', buffer: TINY_PNG } },
  });
  expect(image.ok()).toBe(true);
  const published = await request.patch(`/api/my/products/${id}/status`, {
    headers,
    data: { status: 'published' },
  });
  expect(published.ok()).toBe(true);
  return id;
}

/** A product with at least one photo and no 3D model, so its viewer tab is the rotate view. */
export async function productWithPhotoId(request: APIRequestContext): Promise<string> {
  const res = await request.get('/api/products?pageSize=20');
  const page = (await res.json()) as { items: { id: string; images: unknown[]; model: unknown }[] };
  const found = page.items.find((item) => item.images.length > 0 && !item.model);
  expect(found, 'sample data should include a product with a photo').toBeTruthy();
  return (found as { id: string }).id;
}

/** Product from the sample data that carries a 3D model. */
export async function productWithModelId(request: APIRequestContext): Promise<string> {
  const res = await request.get('/api/products?pageSize=20');
  const page = (await res.json()) as { items: { id: string; model: unknown }[] };
  const found = page.items.find((item) => item.model);
  expect(found, 'sample data should include a product with a 3D model').toBeTruthy();
  return (found as { id: string }).id;
}

/** Signs an existing account in again from a fresh browser context (new refresh cookie). */
export async function signInAgain(context: BrowserContext, phone: string): Promise<void> {
  const res = await context.request.post('/api/auth/login', { data: { phone } });
  expect(res.ok()).toBe(true);
}
