import { expect, test, type Page } from '@playwright/test';
import { ADMIN_PHONE, freshPhone, hasHorizontalScroll, signIn } from './helpers';
import { translator } from './i18n';

const t = translator('uz');
const localDigits = (phone: string) => phone.replace('+998', '');

async function signInWith(page: Page, phone: string) {
  await page.getByLabel(t('auth.phoneLabel')).fill(localDigits(phone));
  await page
    .getByRole('main')
    .getByRole('button', { name: t('auth.submit'), exact: true })
    .click();
}

const ROLES = [
  { key: 'customer', url: /\/kirish$/ },
  { key: 'worker', url: /\/royxatdan-otish\?rol=hunarmand$/ },
  { key: 'admin', url: /\/admin-kirish$/ },
] as const;

const SHOTS = process.env.E2E_SCREENSHOT_DIR;

for (const width of [360, 1280]) {
  test.describe(`header sign-in menu (${width}px)`, () => {
    test.use({ viewport: { width, height: 800 } });

    test('"Kirish" opens the customer, worker and admin entries, each 48 px or taller', async ({
      page,
    }) => {
      await page.goto('/');
      const trigger = page.getByRole('banner').getByRole('button', { name: t('header.signIn') });
      expect((await trigger.boundingBox())?.height).toBeGreaterThanOrEqual(48);
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await trigger.click();
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await expect(page.getByText(t('header.signInAs'))).toBeVisible();
      for (const role of ROLES) {
        const link = page.getByRole('banner').getByRole('link', {
          name: new RegExp(t(`header.roles.${role.key}.title`)),
        });
        expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(48);
      }
      expect(await hasHorizontalScroll(page)).toBe(false);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/signin-menu-${width}.png` });

      await page.keyboard.press('Escape');
      await expect(page.getByText(t('header.signInAs'))).toHaveCount(0);
      await expect(trigger).toBeFocused();
    });

    for (const role of ROLES) {
      test(`the ${role.key} entry opens its sign-in page`, async ({ page }) => {
        await page.goto('/');
        await page
          .getByRole('banner')
          .getByRole('button', { name: t('header.signIn') })
          .click();
        await page
          .getByRole('banner')
          .getByRole('link', { name: new RegExp(t(`header.roles.${role.key}.title`)) })
          .click();
        await expect(page).toHaveURL(role.url);
        await expect(page.getByText(t('header.signInAs'))).toHaveCount(0);
      });
    }
  });
}

test.describe('/admin-kirish', () => {
  test('a number outside ADMIN_PHONES is refused and stays signed out', async ({ page }) => {
    await page.goto('/admin-kirish');
    await signInWith(page, freshPhone());
    await expect(page.getByRole('alert')).toHaveText(t('errors.NOT_ADMIN_PHONE'));
    await expect(page).toHaveURL(/\/admin-kirish$/);
  });

  test('the admin number goes straight to /admin, with no code step', async ({ page }) => {
    await page.goto('/admin-kirish');
    await signInWith(page, ADMIN_PHONE);
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
