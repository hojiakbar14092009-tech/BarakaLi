import { expect, test } from '@playwright/test';
import { VIEWPORTS } from './helpers';
import { translator, type Language } from './i18n';

const CATERING_WORD = /catering|кейтеринг/i;

for (const viewport of VIEWPORTS) {
  test.describe(`catering is gone (${viewport.name} ${viewport.width}px)`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const language of ['uz', 'ru'] as const satisfies readonly Language[]) {
      test(`home page and navigation never mention it (${language})`, async ({ page }) => {
        await page.addInitScript((lang) => {
          window.localStorage.setItem('barakali.language', lang);
        }, language);
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        const t = translator(language);
        await expect(page.locator('body')).not.toContainText(CATERING_WORD);
        await expect(page.getByRole('link', { name: CATERING_WORD })).toHaveCount(0);
        await expect(page.getByRole('search')).toBeVisible();
        if (viewport.width >= 1024) {
          await expect(page.getByRole('link', { name: t('home.hero.primaryCta') })).toBeVisible();
        } else {
          await expect(page.getByText(t('home.becomeWorkerTitle'), { exact: true })).toBeVisible();
        }
        await expect(page.getByRole('heading', { name: t('home.howTitle') })).toBeVisible();
        await expect(page.getByRole('heading', { name: t('home.featuredTitle') })).toBeVisible();
      });
    }
  });
}

test('the /catering page and its API are gone', async ({ page, request }) => {
  await page.goto('/catering');
  await expect(page.getByRole('heading', { level: 1 })).not.toContainText(CATERING_WORD);
  await expect(page.locator('form')).toHaveCount(0);
  const res = await request.post('/api/catering-requests', { data: { name: 'Malika' } });
  expect(res.status()).toBe(404);
});
