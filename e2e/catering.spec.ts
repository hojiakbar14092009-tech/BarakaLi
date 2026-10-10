import { expect, test, type Page } from '@playwright/test';
import { VIEWPORTS, hasHorizontalScroll, smallTouchTargets } from './helpers';
import { translator, type Language } from './i18n';

async function useLanguage(page: Page, language: Language): Promise<void> {
  await page.addInitScript((lang) => {
    window.localStorage.setItem('barakali.language', lang);
  }, language);
}

/** Rendered line count of the hero title. */
async function heroTitleLines(page: Page): Promise<number> {
  return page.getByRole('heading', { level: 1 }).evaluate((el) => {
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
    return Math.round(el.getBoundingClientRect().height / lineHeight);
  });
}

for (const language of ['uz', 'ru'] as const) {
  const t = translator(language);

  for (const viewport of VIEWPORTS) {
    test.describe(`catering hero, ${language}, ${viewport.width}px`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      test('is the first section, fits in three lines, and keeps the page within the screen', async ({
        page,
      }) => {
        await useLanguage(page, language);
        await page.goto('/');
        const title = page.getByRole('heading', { level: 1 });
        await expect(title).toHaveText(t('catering.hero.title'));
        await expect(title).toBeInViewport();
        expect(await heroTitleLines(page)).toBeLessThanOrEqual(3);

        const catalog = page.locator('#katalog');
        const [titleTop, catalogTop] = await Promise.all([
          title.evaluate((el) => el.getBoundingClientRect().top),
          catalog.evaluate((el) => el.getBoundingClientRect().top),
        ]);
        expect(titleTop).toBeLessThan(catalogTop);

        await page.waitForLoadState('networkidle');
        expect(await hasHorizontalScroll(page), 'home scrolls sideways').toBe(false);
        expect(await smallTouchTargets(page), 'targets under 48px').toEqual([]);
        await expect(
          page.getByRole('link', { name: t('header.catering'), exact: true }),
        ).toBeVisible();
      });
    });
  }
}

test.describe('catering hero actions', () => {
  const t = translator('uz');
  test.use({ viewport: { width: 360, height: 780 } });

  test('"Katalogga o\'tish" scrolls to the catalog without leaving the page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: t('catering.hero.catalogCta') }).click();
    await expect(page.locator('#katalog')).toBeInViewport();
    await expect(page).toHaveURL(/\/$/);
  });

  test('/catering opens on its own and links back to the catalog on the home page', async ({
    page,
  }) => {
    await page.goto('/catering');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(t('catering.hero.title'));
    await expect(page.locator('#katalog')).toHaveCount(0);
    await page.getByRole('link', { name: t('catering.hero.catalogCta') }).click();
    await expect(page).toHaveURL(/\/#katalog$/);
    await expect(page.locator('#katalog')).toBeInViewport();
  });
});
