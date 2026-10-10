import { expect, test, type Page } from '@playwright/test';
import { ADMIN_PHONE, freshPhone, hasHorizontalScroll, signIn } from './helpers';
import { translator } from './i18n';

const t = translator('uz');
const localDigits = (phone: string) => phone.replace('+998', '');

async function askCode(page: Page, phone: string) {
  await page.getByLabel(t('auth.phoneLabel')).fill(localDigits(phone));
  await page.getByRole('button', { name: t('auth.sendCode') }).click();
}

for (const width of [360, 1280]) {
  test.describe(`header admin entry (${width}px)`, () => {
    test.use({ viewport: { width, height: 800 } });

    test('"Admin" sits next to "Kirish", both 48 px, without sideways scroll', async ({ page }) => {
      await page.goto('/');
      const banner = page.getByRole('banner');
      const signInLink = banner.getByRole('link', { name: t('header.signIn'), exact: true });
      const adminLink = banner.getByRole('link', { name: t('header.admin'), exact: true });
      const [signInBox, adminBox] = [await signInLink.boundingBox(), await adminLink.boundingBox()];
      expect(signInBox?.height).toBeGreaterThanOrEqual(48);
      expect(adminBox?.height).toBeGreaterThanOrEqual(48);
      expect(adminBox?.width).toBeGreaterThanOrEqual(48);
      expect(adminBox?.y).toBeCloseTo(signInBox?.y ?? 0, 0);
      expect(await hasHorizontalScroll(page)).toBe(false);
      await adminLink.click();
      await expect(page).toHaveURL(/\/admin-kirish$/);
    });
  });
}

test.describe('/admin-kirish', () => {
  test('a number outside ADMIN_PHONES gets no code', async ({ page }) => {
    await page.goto('/admin-kirish');
    await askCode(page, freshPhone());
    await expect(page.getByRole('alert')).toHaveText(t('errors.NOT_ADMIN_PHONE'));
    await expect(page.getByText(/Tasdiqlash kodingiz/)).toHaveCount(0);
    await expect(page.getByLabel(t('auth.codeLabel'))).toHaveCount(0);
  });

  test('the admin number sees its code on the page and lands on /admin', async ({ page }) => {
    await page.goto('/admin-kirish');
    await askCode(page, ADMIN_PHONE);
    await expect(page.getByText(/Tasdiqlash kodingiz: \d{6}/)).toBeVisible();
    await page.getByRole('button', { name: t('auth.fillCode') }).click();
    await page.getByRole('button', { name: t('auth.verify') }).click();
    await expect(page).toHaveURL(/\/admin$/);
    // The number never travels in the address bar.
    expect(page.url()).not.toContain(localDigits(ADMIN_PHONE));
  });

  test('a signed-in customer cannot open /admin', async ({ page, context }) => {
    await signIn(context, 'Mijoz');
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: t('forbidden.title') })).toBeVisible();
  });
});
