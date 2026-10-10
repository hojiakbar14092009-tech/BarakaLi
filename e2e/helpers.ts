import { expect, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';

export const VIEWPORTS = [
  { name: 'phone', width: 360, height: 800 },
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
  const request = context.request;
  const codeRes = await request.post('/api/auth/request-code', { data: { phone } });
  expect(codeRes.ok()).toBe(true);
  const { code } = (await codeRes.json()) as { code: string };
  const verify = await request.post('/api/auth/verify', { data: { phone, code, name } });
  expect(verify.ok()).toBe(true);
  const body = (await verify.json()) as { accessToken: string; user: { id: string } };
  return { phone, token: body.accessToken, userId: body.user.id };
}

const auth = (account: Account) => ({ Authorization: `Bearer ${account.token}` });

export async function firstCategoryId(request: APIRequestContext): Promise<string> {
  const res = await request.get('/api/categories');
  const categories = (await res.json()) as { id: string; slug: string }[];
  return categories[0]?.id ?? '';
}

const ORIGIN = 'http://localhost:4173';

let adminToken: Promise<string> | undefined;

/**
 * One administrator session for the whole run: sign-in codes are limited per phone, and every
 * test worker needs an approval.
 */
function adminAccessToken(): Promise<string> {
  adminToken ??= (async () => {
    const headers = { 'Content-Type': 'application/json', Origin: ORIGIN };
    const codeRes = await fetch(`${ORIGIN}/api/auth/request-code`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ phone: ADMIN_PHONE }),
    });
    const { code } = (await codeRes.json()) as { code: string };
    const verify = await fetch(`${ORIGIN}/api/auth/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ phone: ADMIN_PHONE, code, name: 'Admin' }),
    });
    return ((await verify.json()) as { accessToken: string }).accessToken;
  })();
  return adminToken;
}

/** Approves a worker application as the administrator, through the public API. */
export async function approveWorker(workerId: string): Promise<void> {
  const res = await fetch(`${ORIGIN}/api/admin/workers/${workerId}/approve`, {
    method: 'POST',
    headers: { Origin: ORIGIN, Authorization: `Bearer ${await adminAccessToken()}` },
  });
  expect(res.status).toBe(204);
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

// 1x1 PNG: enough for the server's image pipeline to accept a photo.
const TINY_PNG = Buffer.from(
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
  const codeRes = await context.request.post('/api/auth/request-code', { data: { phone } });
  const { code } = (await codeRes.json()) as { code: string };
  const verify = await context.request.post('/api/auth/verify', { data: { phone, code } });
  expect(verify.ok()).toBe(true);
}
