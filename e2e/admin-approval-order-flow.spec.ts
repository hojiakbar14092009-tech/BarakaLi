import { expect, test, type Page } from '@playwright/test';
import {
  CARD,
  TINY_PNG,
  becomeWorker,
  freshPhone,
  hasHorizontalScroll,
  loginAsAdmin,
  signIn,
  smallTouchTargets,
} from './helpers';
import { translator } from './i18n';

const t = translator('uz');

async function fillExposedCode(page: Page): Promise<void> {
  await page.getByRole('button', { name: t('auth.fillCode') }).click();
}

async function payWithCard(page: Page): Promise<void> {
  await page.getByLabel(t('payment.cardNumber')).fill(CARD.number);
  await page.getByLabel(t('payment.expiry')).fill(CARD.expiry);
  await page.getByLabel(t('payment.cvc')).fill(CARD.cvc);
  await page.locator('form button[type="submit"]').click();
}

/**
 * End to end: an administrator has to approve a worker before that worker's products, and the
 * orders on them, exist for anyone else. This walks the whole chain on a 360px phone screen —
 * application, approval, publishing, purchase, the worker's own incoming queue, contact details,
 * and a second worker who must never see any of it.
 */
test.describe('admin approval -> worker product -> customer order (360px)', () => {
  test.use({ viewport: { width: 360, height: 800 } });

  test('admin approves the worker; the worker publishes and fulfils an order a customer places; a rival worker never sees it', async ({
    page,
    browser,
  }) => {
    test.setTimeout(180_000);

    // A second, already-approved worker who must never see this order in their own queue.
    const rivalContext = await browser.newContext({ viewport: { width: 360, height: 800 } });
    const rival = await signIn(rivalContext, 'Raqib Usta');
    await becomeWorker(rivalContext.request, rival, 'Raqib Usta');
    const rivalPage = await rivalContext.newPage();

    // --- The worker signs up: the application starts pending, with no public profile yet. ---
    const workerName = `Yangi Usta ${Date.now() % 100_000}`;
    await page.goto('/royxatdan-otish?rol=hunarmand');
    expect(await hasHorizontalScroll(page), 'signup page scrolls sideways').toBe(false);
    await page.getByLabel(t('auth.phoneLabel')).fill(freshPhone().slice(4));
    await page.getByRole('button', { name: t('auth.sendCode') }).click();
    await fillExposedCode(page);
    await page.getByLabel(t('auth.nameLabel')).fill(workerName);
    await page.getByRole('button', { name: t('auth.verify') }).click();

    await expect(page.getByRole('heading', { name: t('auth.workerTitle') })).toBeVisible();
    await page.getByLabel(t('auth.displayNameLabel')).fill(workerName);
    await page.getByLabel(t('auth.categoryLabel')).selectOption({ index: 1 });
    await page.getByRole('button', { name: t('auth.createProfile') }).click();
    await expect(page).toHaveURL(/\/hunarmand\/panel/);
    await expect(page.getByText(t('application.status.pending'))).toBeVisible();

    // --- The administrator approves the application from their own admin session. The login
    // itself (one real SMS round trip, cached and shared with every other spec that needs an
    // admin page) is not repeated here; what this test is for is the real "Tasdiqlash" click. ---
    const adminContext = await browser.newContext({ viewport: { width: 360, height: 800 } });
    await loginAsAdmin(adminContext);
    const adminPage = await adminContext.newPage();
    await adminPage.goto('/admin/hunarmandlar');
    await adminPage.waitForLoadState('networkidle');
    expect(await hasHorizontalScroll(adminPage), 'admin applications page scrolls sideways').toBe(
      false,
    );
    expect(
      await smallTouchTargets(adminPage),
      'admin applications page has targets under 48px',
    ).toEqual([]);
    const approveButton = adminPage.getByRole('button', {
      name: new RegExp(`^${t('admin.workers.approve')}: ${workerName}$`),
    });
    await expect(approveButton).toBeVisible();
    await approveButton.click();
    const dialog = adminPage.getByRole('dialog', { name: t('admin.workers.dialog.approve.title') });
    await expect(dialog).toContainText(workerName);
    await dialog.getByRole('button', { name: t('admin.workers.dialog.approve.confirm') }).click();
    await expect(approveButton).toHaveCount(0);
    await adminContext.close();

    // --- The worker sees the approval and publishes one product. ---
    await page.reload();
    await expect(page.getByText(t('application.status.approved'))).toBeVisible();

    const productTitle = `Sinov mahsuloti ${Date.now() % 100_000}`;
    await page.goto('/ishlar');
    await page.getByRole('button', { name: t('cabinet.products.add') }).click();
    await page.getByLabel(t('cabinet.form.title')).fill(productTitle);
    await page.getByLabel(t('cabinet.form.retailPrice')).fill('150000');
    await page.getByLabel(t('cabinet.form.stock')).fill('5');
    await page.getByRole('button', { name: t('cabinet.form.saveDraft'), exact: true }).click();
    await expect(page.getByRole('heading', { name: t('cabinet.form.images') })).toBeVisible();
    expect(await hasHorizontalScroll(page), 'product form scrolls sideways').toBe(false);
    expect(await smallTouchTargets(page), 'product form has targets under 48px').toEqual([]);

    await page
      .locator('#photo-input')
      .setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: TINY_PNG });
    await expect(page.getByRole('img', { name: productTitle }).first()).toBeVisible();

    await page.getByRole('button', { name: t('cabinet.form.saveAndPublish'), exact: true }).click();
    await expect(page.getByText(t('cabinet.form.saved'))).toBeVisible();
    await page.getByRole('button', { name: t('common.close') }).click();
    const productLink = page.getByRole('link', { name: new RegExp(productTitle) });
    await expect(productLink).toBeVisible();
    await productLink.click();
    await expect(page).toHaveURL(/\/mahsulot\//);
    const productPath = new URL(page.url()).pathname;

    // --- A customer finds the product by its public URL and buys it. ---
    const customerContext = await browser.newContext({ viewport: { width: 360, height: 800 } });
    const customerPage = await customerContext.newPage();
    await customerPage.goto(productPath);
    await expect(customerPage.getByRole('heading', { level: 1, name: productTitle })).toBeVisible();
    expect(await hasHorizontalScroll(customerPage), 'product page scrolls sideways').toBe(false);

    const customer = await signIn(customerContext, 'Buyurtmachi Xaridorova');
    expect(customer.userId).not.toBe(rival.userId);
    await customerPage.reload();
    await customerPage.getByRole('button', { name: t('product.increase') }).click();
    await customerPage.getByRole('button', { name: t('product.addToCart') }).click();
    await customerPage.goto('/savat');
    await expect(customerPage.getByText(productTitle)).toBeVisible();
    await customerPage.getByRole('radio', { name: t('cart.pickup') }).check();
    await customerPage.getByRole('button', { name: t('cart.checkout') }).click();
    await expect(customerPage).toHaveURL(/\/tolov\//);
    await payWithCard(customerPage);
    await expect(customerPage.getByRole('heading', { name: t('payment.success') })).toBeVisible();
    await customerPage.getByRole('link', { name: t('payment.toOrder') }).click();
    await expect(customerPage.getByText(t('orders.waitingWorker'))).toBeVisible();
    const orderPath = new URL(customerPage.url()).pathname;

    // --- The worker sees the new order in "Kelgan buyurtmalar" (not a direct link) and accepts it. ---
    await page.goto('/buyurtmalar');
    await page.waitForLoadState('networkidle');
    expect(await hasHorizontalScroll(page), 'incoming orders page scrolls sideways').toBe(false);
    const orderRow = page.getByRole('link', { name: new RegExp(productTitle) });
    await expect(orderRow).toBeVisible();
    await expect(orderRow.getByText(t('orders.status.new'))).toBeVisible();
    await orderRow.click();
    await expect(page).toHaveURL(orderPath);
    const acceptButton = page.getByRole('button', { name: t('orders.actions.accept') });
    await expect(acceptButton).toBeVisible();
    await acceptButton.click();
    await expect(acceptButton).toBeHidden();
    await expect(page.getByText(t('orders.status.accepted')).first()).toBeVisible();

    // --- The order never shows up for the rival worker, before or after acceptance. ---
    await rivalPage.goto('/buyurtmalar');
    await rivalPage.waitForLoadState('networkidle');
    await expect(rivalPage.getByText(productTitle)).toHaveCount(0);
    const orderId = orderPath.split('/').pop();
    const rivalRead = await rivalContext.request.get(`/api/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${rival.token}` },
    });
    expect(rivalRead.status(), 'rival can read the order via the API').toBe(404);

    // --- Only now, after acceptance, does the customer see the worker's contact details. ---
    await customerPage.goto(orderPath);
    await customerPage.waitForLoadState('networkidle');
    expect(await hasHorizontalScroll(customerPage), 'order page scrolls sideways').toBe(false);
    expect(await smallTouchTargets(customerPage), 'order page has targets under 48px').toEqual([]);
    await expect(
      customerPage.getByRole('link', { name: new RegExp(t('orders.phone')) }),
    ).toBeVisible();

    await rivalContext.close();
    await customerContext.close();
  });
});
