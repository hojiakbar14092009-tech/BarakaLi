import { expect, test, type Page } from '@playwright/test';
import {
  CARD,
  addWindow,
  becomeWorker,
  createPublishedProduct,
  freshPhone,
  signIn,
  signInAgain,
} from './helpers';
import { translator, type Language } from './i18n';

async function useLanguage(page: Page, language: Language): Promise<void> {
  await page.addInitScript((value) => {
    window.localStorage.setItem('barakali.language', value);
  }, language);
}

async function payWithCard(page: Page, language: Language): Promise<void> {
  const t = translator(language);
  await page.getByLabel(t('payment.cardNumber')).fill(CARD.number);
  await page.getByLabel(t('payment.expiry')).fill(CARD.expiry);
  await page.getByLabel(t('payment.cvc')).fill(CARD.cvc);
  await page.locator('form button[type="submit"]').click();
}

for (const language of ['uz', 'ru'] as const) {
  const t = translator(language);

  test.describe(`purchase flow (${language})`, () => {
    test('sign in, buy a product, fulfil it, review it and complain', async ({ page, browser }) => {
      test.setTimeout(120_000);
      await useLanguage(page, language);

      // A worker with one product, prepared through the API.
      const workerContext = await browser.newContext();
      const worker = await signIn(workerContext, 'Usta Karima');
      await becomeWorker(workerContext.request, worker, 'Usta Karima');
      const title = `Kashta sumka ${language} ${Date.now() % 100000}`;
      const productId = await createPublishedProduct(workerContext.request, worker, {
        title,
        retailPrice: 100_000,
        stock: 10,
      });

      // Customer signs in through the real form (SMS code is shown in the form for this server).
      await page.goto('/kirish');
      await page.getByLabel(t('auth.phoneLabel')).fill(freshPhone().slice(4));
      await page.getByRole('button', { name: t('auth.sendCode') }).click();
      await page.getByRole('button', { name: t('auth.fillCode') }).click();
      await page.getByRole('button', { name: t('auth.verify') }).click();
      await expect(page).toHaveURL(/\/$/);

      // Product -> cart -> checkout.
      await page.goto(`/mahsulot/${productId}`);
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
      await page.getByRole('button', { name: t('product.increase') }).click();
      await page.getByRole('button', { name: t('product.addToCart') }).click();
      await page.goto('/savat');
      await expect(page.getByText(title)).toBeVisible();
      await page.getByRole('radio', { name: t('cart.pickup') }).check();
      await page.getByRole('button', { name: t('cart.checkout') }).click();
      await expect(page).toHaveURL(/\/tolov\//);

      // Payment, then the confirmation.
      await payWithCard(page, language);
      await expect(page.getByRole('heading', { name: t('payment.success') })).toBeVisible();
      await page.getByRole('link', { name: t('payment.toOrder') }).click();
      await expect(page.getByText(t('orders.waitingWorker'))).toBeVisible();
      const orderPath = new URL(page.url()).pathname;

      // The worker moves the order through every status from the order page.
      const workerPage = await workerContext.newPage();
      await useLanguage(workerPage, language);
      await workerPage.goto(orderPath);
      for (const action of ['accept', 'start', 'ready', 'deliver'] as const) {
        const button = workerPage.getByRole('button', { name: t(`orders.actions.${action}`) });
        await button.click();
        await expect(button).toBeHidden();
      }
      await expect(workerPage.getByText(t('orders.status.delivered')).first()).toBeVisible();

      // The customer now sees the worker's phone, reviews and complains.
      await page.reload();
      await expect(page.getByText(t('orders.phoneHidden'))).toBeHidden();
      await page
        .getByRole('radio', { name: t('orders.review.stars').replace('{{count}}', '5') })
        .click();
      await page.getByLabel(t('orders.review.commentLabel')).fill('Zoʻr ish!');
      await page.getByRole('button', { name: t('orders.review.submit') }).click();
      await expect(page.getByText('Zoʻr ish!')).toBeVisible();

      await page.getByRole('button', { name: t('orders.complaint.button') }).click();
      await page.getByLabel(t('orders.complaint.reasonLabel')).fill('Qadoqlash yomon edi');
      await page.getByRole('button', { name: t('orders.complaint.submit') }).click();
      await expect(page.getByText(t('orders.complaint.sent'))).toBeVisible();

      // 2 × 100 000 with 2% commission: the worker sees 196 000.
      await workerPage.goto('/daromad');
      await expect(workerPage.getByText(/196\s000/).first()).toBeVisible();
      await workerContext.close();
    });
  });
}

test.describe('service order flow (uz)', () => {
  const t = translator('uz');

  test('book a free slot from the worker profile; no payment, the worker accepts', async ({
    page,
    browser,
  }) => {
    test.setTimeout(120_000);
    const workerContext = await browser.newContext();
    const worker = await signIn(workerContext, 'Tikuvchi Zulfiya');
    const workerId = await becomeWorker(workerContext.request, worker, 'Tikuvchi Zulfiya');
    await addWindow(workerContext.request, worker, 5, 6);

    const customer = await signIn(page.context(), 'Mijoz Anvar');
    expect(customer.userId).not.toBe(worker.userId);
    await page.goto(`/hunarmand/${workerId}`);
    await page.getByRole('link', { name: t('catalog.orderService') }).click();
    await expect(page).toHaveURL(/\/buyurtma\/yangi/);

    const slots = page.getByRole('group', { name: t('serviceOrder.time') }).getByRole('button');
    await slots.first().click();
    await page.getByLabel(t('serviceOrder.description')).fill('Atlasdan koʻylak tikib bering');
    await page.getByRole('button', { name: t('serviceOrder.submit') }).click();
    // No payment step: the request lands on the order page and waits for the worker.
    await expect(page).toHaveURL(/\/buyurtmalar\//);
    await expect(page.getByText(t('orders.waitingWorker'))).toBeVisible();
    await expect(page.getByText(/soʻm/)).toHaveCount(0);
    const orderPath = new URL(page.url()).pathname;

    const workerPage = await workerContext.newPage();
    await workerPage.goto(orderPath);
    await workerPage.getByRole('button', { name: t('orders.actions.accept') }).click();
    await expect(workerPage.getByText(t('orders.status.accepted')).first()).toBeVisible();
    await page.reload();
    await expect(page.getByRole('link', { name: new RegExp(t('orders.phone')) })).toBeVisible();

    // The booked hour disappears from what the next customer can pick.
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await signInAgain(other, (await signIn(other, 'Boshqa Mijoz')).phone);
    await otherPage.goto(`/buyurtma/yangi?hunarmand=${workerId}`);
    const remaining = otherPage
      .getByRole('group', { name: t('serviceOrder.time') })
      .getByRole('button');
    await expect(remaining.first()).toBeVisible();
    expect(await remaining.count()).toBe(5);
    await other.close();
    await workerContext.close();
  });
});
