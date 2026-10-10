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
  return ((await res.json()) as { workerId: string }).workerId;
}

export async function setHourlyRate(
  request: APIRequestContext,
  account: Account,
  hourlyRate: number,
): Promise<void> {
  const res = await request.put('/api/my/hourly-rate', {
    headers: auth(account),
    data: { hourlyRate },
  });
  expect(res.ok()).toBe(true);
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
