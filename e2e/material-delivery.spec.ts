import { expect, test, type Page } from '@playwright/test';
import { becomeWorker, CARD, hasHorizontalScroll, loginAsAdmin, signIn } from './helpers';
import { translator } from './i18n';

const t = translator('uz');
const ADDRESS = 'Chilonzor tumani, 9-mavze, 14-uy';
const SHOTS = process.env.E2E_SCREENSHOT_DIR;

async function payWithCard(page: Page): Promise<void> {
  await page.getByLabel(t('payment.cardNumber')).fill(CARD.number);
  await page.getByLabel(t('payment.expiry')).fill(CARD.expiry);
  await page.getByLabel(t('payment.cvc')).fill(CARD.cvc);
  await page.locator('form button[type="submit"]').click();
}

test.describe('materials delivery (360px)', () => {
  test.use({ viewport: { width: 360, height: 800 } });

  test('a paid materials order reaches the admin, goes out with a courier and the worker is told', async ({
    page,
    browser,
    context,
  }) => {
    const workerName = `Material Usta ${Date.now() % 100_000}`;
    const worker = await signIn(context, workerName);
    await becomeWorker(context.request, worker, workerName);

    // --- The worker orders materials with a delivery address and pays. ---
    await page.goto('/materiallar');
    const first = page.getByRole('main').getByRole('group').first();
    await first.getByRole('button', { name: t('materials.more') }).click();
    await page.getByRole('button', { name: t('materials.order') }).click();
    await expect(page.getByText(t('validation.ADDRESS_REQUIRED'))).toBeVisible();
    await page.getByLabel(t('materials.address')).fill(ADDRESS);
    expect(await hasHorizontalScroll(page)).toBe(false);
    await page.getByRole('button', { name: t('materials.order') }).click();
    await expect(page).toHaveURL(/\/materiallar\/tolov\//);
    await payWithCard(page);
    await expect(page.getByText(t('materials.paid'))).toBeVisible();

    // --- The administrator sees it as new, with the worker's number and address, and ships it. ---
    const adminContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await loginAsAdmin(adminContext);
    const admin = await adminContext.newPage();
    await admin.goto('/admin/materiallar');
    await expect(admin.getByLabel(/yangi material buyurtmasi/)).toBeVisible();
    const card = admin.getByRole('listitem').filter({ hasText: workerName });
    await expect(card.getByText(t('admin.materials.new'))).toBeVisible();
    await expect(card.getByText(`Manzil: ${ADDRESS}`)).toBeVisible();
    await expect(card.getByRole('link', { name: new RegExp(workerName) })).toHaveAttribute(
      'href',
      `tel:${worker.phone}`,
    );
    if (SHOTS) await admin.screenshot({ path: `${SHOTS}/admin-materials.png` });
    await card.getByRole('button', { name: t('admin.materials.ship') }).click();
    await card.getByLabel(t('admin.materials.courierName')).fill('Jasur');
    await card.getByLabel(t('admin.materials.courierPhone')).fill('90 765 43 21');
    if (SHOTS) await card.screenshot({ path: `${SHOTS}/admin-ship-form.png` });
    await card.getByRole('button', { name: t('admin.materials.shipConfirm') }).click();
    await expect(card.getByRole('button', { name: t('admin.materials.deliver') })).toBeVisible();
    await adminContext.close();

    // --- The worker is told it is on its way, by whom, and can call the courier. ---
    await page.goto('/hunarmand/panel');
    await expect(page.getByText(t('cabinet.materialsShipped'))).toBeVisible();
    await page.getByText(t('cabinet.materialsShipped')).click();
    await expect(page).toHaveURL(/\/materiallar$/);
    await expect(page.getByRole('status').filter({ hasText: 'Jasur' })).toBeVisible();
    await expect(
      page.getByRole('link', {
        name: t('materials.callCourierLabel').replace('{{name}}', 'Jasur'),
      }),
    ).toHaveAttribute('href', 'tel:+998907654321');
    expect(await hasHorizontalScroll(page)).toBe(false);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/worker-materials.png`, fullPage: true });
  });
});
