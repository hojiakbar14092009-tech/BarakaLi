import { expect, test, type Page } from '@playwright/test';
import { hasHorizontalScroll, smallTouchTargets } from './helpers';
import { translator, type Language } from './i18n';

const DESKTOPS = [
  { width: 1280, height: 800 },
  { width: 1536, height: 864 },
] as const;
const SMALL_SCREENS = [
  { name: 'phone', width: 360, height: 780 },
  { name: 'tablet', width: 768, height: 1024 },
] as const;

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

  for (const viewport of DESKTOPS) {
    test.describe(`catering on desktop, ${language}, ${viewport.width}px`, () => {
      test.use({ viewport });

      test('opens first, fits in three lines and keeps the page within the screen', async ({
        page,
      }) => {
        await useLanguage(page, language);
        await page.goto('/');
        const title = page.getByRole('heading', { level: 1 });
        await expect(title).toHaveText(t('catering.hero.title'));
        await expect(title).toBeInViewport();
        expect(await heroTitleLines(page)).toBeLessThanOrEqual(3);

        const [titleTop, catalogTop] = await Promise.all([
          title.evaluate((el) => el.getBoundingClientRect().top),
          page.locator('#katalog').evaluate((el) => el.getBoundingClientRect().top),
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

for (const screen of SMALL_SCREENS) {
  test.describe(`catering is desktop-only (${screen.name} ${screen.width}px)`, () => {
    const t = translator('uz');
    test.use({ viewport: { width: screen.width, height: screen.height } });

    test('home opens on the marketplace and /catering goes back to it', async ({ page }) => {
      const cateringRequests: string[] = [];
      page.on('request', (req) => {
        if (/CateringLanding|\/catering\/.+\.webp/.test(req.url())) {
          cateringRequests.push(req.url());
        }
      });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0);
      await expect(
        page.getByRole('link', { name: t('header.catering'), exact: true }),
      ).toBeHidden();
      await expect(page.locator('#katalog')).toBeVisible();
      expect(cateringRequests, 'catering code or images loaded on a small screen').toEqual([]);

      await page.goto('/catering');
      await expect(page).toHaveURL(/\/$/);
      expect(await hasHorizontalScroll(page)).toBe(false);
    });
  });
}

test.describe('catering actions on desktop', () => {
  const t = translator('uz');
  test.use({ viewport: { width: 1280, height: 800 } });

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

  test('switches between the customer and worker tabs with the keyboard', async ({ page }) => {
    await page.goto('/');
    const customers = page.getByRole('tab', { name: t('catering.why.tabs.customers') });
    const workers = page.getByRole('tab', { name: t('catering.why.tabs.workers') });
    await expect(customers).toHaveAttribute('aria-selected', 'true');
    await customers.focus();
    await page.keyboard.press('ArrowRight');
    await expect(workers).toHaveAttribute('aria-selected', 'true');
    await expect(workers).toBeFocused();
    await expect(page.getByRole('tabpanel')).toContainText('2%');
  });
});
