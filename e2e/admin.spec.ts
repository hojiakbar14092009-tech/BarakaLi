import { expect, test, type Page } from '@playwright/test';
import { ADMIN_PHONE, hasHorizontalScroll, signIn, smallTouchTargets } from './helpers';
import { translator } from './i18n';

const t = translator('uz');
const PHONE_DIGITS = ADMIN_PHONE.slice(4);

async function signInAsAdminThroughTheForm(page: Page): Promise<void> {
  await page.goto('/kirish');
  await page.getByLabel(t('auth.phoneLabel')).fill(PHONE_DIGITS);
  await page.getByRole('button', { name: t('auth.sendCode') }).click();
  await page.getByRole('button', { name: t('auth.fillCode') }).click();
  await page.getByRole('button', { name: t('auth.verify') }).click();
}

for (const viewport of [
  { name: 'phone', width: 360, height: 800 },
  { name: 'desktop', width: 1280, height: 800 },
]) {
  test.describe(`admin access (${viewport.name} ${viewport.width}px)`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test('an ordinary signed-in user gets the 403 page with a way home', async ({
      page,
      context,
    }) => {
      await signIn(context, 'Oddiy Mijoz');
      await page.goto('/admin');
      await expect(
        page.getByRole('heading', { level: 1, name: t('forbidden.title') }),
      ).toBeVisible();
      await page.getByRole('link', { name: t('forbidden.home') }).click();
      await expect(page).toHaveURL(/\/$/);
      expect(await hasHorizontalScroll(page)).toBe(false);
    });

    test('the API refuses admin data to an ordinary user and to anonymous visitors', async ({
      context,
      request,
    }) => {
      const customer = await signIn(context, 'API Mijoz');
      const refused = await request.get('/api/admin/stats', {
        headers: { Authorization: `Bearer ${customer.token}` },
      });
      expect(refused.status()).toBe(403);
      expect((await request.get('/api/admin/stats')).status()).toBe(401);
      expect((await request.get('/api/admin/audit')).status()).toBe(401);
    });
  });
}

test.describe('administrator (1280px)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('signs in with the admin number, lands on the panel and approves a worker who then appears publicly', async ({
    page,
    browser,
  }) => {
    test.setTimeout(120_000);

    // A worker whose application is still pending (created through the public API).
    const workerContext = await browser.newContext();
    const worker = await signIn(workerContext, 'Kutayotgan Usta');
    const categories = (await (await workerContext.request.get('/api/categories')).json()) as {
      id: string;
    }[];
    const applied = await workerContext.request.post('/api/me/worker', {
      headers: { Authorization: `Bearer ${worker.token}` },
      data: { displayName: 'Kutayotgan Usta', categoryId: categories[0]?.id },
    });
    const { workerId } = (await applied.json()) as { workerId: string };
    const publicProfile = () => workerContext.request.get(`/api/workers/${workerId}`);
    expect((await publicProfile()).status()).toBe(404);

    await signInAsAdminThroughTheForm(page);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(
      page.getByRole('heading', { level: 1, name: t('admin.nav.dashboard') }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: t('admin.dashboard.review') })).toBeVisible();

    await page
      .getByRole('navigation', { name: t('admin.nav.label') })
      .getByRole('link', { name: t('admin.nav.workers') })
      .click();
    await expect(page).toHaveURL(/\/admin\/hunarmandlar$/);
    await page.getByRole('searchbox', { name: t('admin.workers.search.label') }).fill('Kutayotgan');
    await page.getByRole('button', { name: t('admin.workers.search.button') }).click();
    await page
      .getByRole('button', { name: `${t('admin.workers.approve')}: Kutayotgan Usta` })
      .click();
    const dialog = page.getByRole('dialog', { name: t('admin.workers.dialog.approve.title') });
    await expect(dialog).toContainText('Kutayotgan Usta');
    await dialog.getByRole('button', { name: t('admin.workers.dialog.approve.confirm') }).click();
    await expect(page.getByRole('status').filter({ hasText: t('toast.approved') })).toBeVisible();

    await expect.poll(async () => (await publicProfile()).status()).toBe(200);

    await page
      .getByRole('navigation', { name: t('admin.nav.label') })
      .getByRole('link', { name: t('admin.nav.audit') })
      .click();
    await expect(
      page.getByText(t('admin.audit.actions.worker.approve'), { exact: true }).first(),
    ).toBeVisible();
    await workerContext.close();
  });

  test('every admin section fits the screen with 48 px targets', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await signInAsAdminThroughTheForm(page);
    await expect(page).toHaveURL(/\/admin$/);
    for (const path of [
      '/admin/hunarmandlar',
      '/admin/mahsulotlar',
      '/admin/buyurtmalar',
      '/admin/foydalanuvchilar',
      '/admin/sharhlar',
      '/admin/xizmat-turlari',
      '/admin/materiallar',
      '/admin/sozlamalar',
      '/admin/audit',
    ]) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await hasHorizontalScroll(page), path).toBe(false);
      expect(await smallTouchTargets(page), path).toEqual([]);
    }
    await context.close();
  });
});
