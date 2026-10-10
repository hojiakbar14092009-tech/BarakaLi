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

test.describe('catering motion respects reduced motion', () => {
  test.use({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });

  test('keeps photos at scale 1 and nothing drifts', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    for (const scale of await page
      .locator('img[data-scale-from]')
      .evaluateAll((imgs) => imgs.map((img) => img.getAttribute('data-scale-from')))) {
      expect(scale).toBe('1');
    }
    const transforms = () =>
      page
        .locator('main *')
        .evaluateAll((els) => els.map((el) => getComputedStyle(el).transform).join('|'));
    await page.waitForTimeout(1500);
    const before = await transforms();
    await page.waitForTimeout(800);
    expect(await transforms()).toBe(before);
  });
});

test.describe('catering request form (desktop)', () => {
  const t = translator('uz');
  test.use({ viewport: { width: 1280, height: 800 } });

  function inDays(days: number): string {
    const date = new Date(Date.now() + 5 * 3_600_000);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  test('a service card opens the form with that type, and the request is accepted', async ({
    page,
  }) => {
    await page.goto('/');
    const title = t('catering.services.ctaLabel').replace('{{service}}', 'Pishiriq va tort');
    await page.getByRole('link', { name: title }).click();
    const form = page.locator('#catering-sorov');
    await expect(form).toBeInViewport();
    await expect(page.getByLabel(t('catering.form.service'))).toHaveValue('pishiriq');
    await expect(page).toHaveURL(/\/$/);

    await page.getByLabel(t('catering.form.name')).fill('Malika');
    await page.getByLabel(t('catering.form.phone')).fill('901234567');
    await page.getByLabel(t('catering.form.date')).fill(inDays(14));
    await page.getByLabel(t('catering.form.guests')).fill('35');
    await page.getByLabel(t('catering.form.note')).fill('Tugʻilgan kun');
    const sent = page.waitForResponse((res) => res.url().endsWith('/api/catering-requests'));
    await form.getByRole('button', { name: t('catering.form.submit') }).click();
    expect((await sent).status()).toBe(201);
    await expect(
      page.getByRole('heading', { name: t('catering.form.successTitle') }),
    ).toBeVisible();
    await expect(page.getByText(t('catering.form.successText'))).toBeVisible();
    expect(page.url()).not.toMatch(/901234567|Malika/);
  });

  test('explains on blur how to fix the guest count and the phone', async ({ page }) => {
    await page.goto('/#catering-sorov');
    const guests = page.getByLabel(t('catering.form.guests'));
    await guests.fill('0');
    await guests.blur();
    await expect(page.getByText(t('validation.GUESTS_MIN'))).toBeVisible();
    const phone = page.getByLabel(t('catering.form.phone'));
    await phone.fill('9012');
    await phone.blur();
    await expect(page.getByText(t('validation.INVALID_PHONE'))).toBeVisible();
    await expect(guests).toHaveAttribute('aria-invalid', 'true');
  });
});

test.describe('remote work is gone', () => {
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 360, height: 780 },
  ]) {
    test(`no "Masofaviy ish" anywhere in the catalog at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      for (const language of ['uz', 'ru'] as const) {
        await useLanguage(page, language);
        for (const route of ['/', '/xizmatlar/barchasi', '/xizmatlar/masofaviy-ishlar']) {
          await page.goto(route);
          await page.waitForLoadState('networkidle');
          await expect(page.locator('body')).not.toContainText(/masofaviy|удалённ/i);
        }
      }
    });
  }
});
