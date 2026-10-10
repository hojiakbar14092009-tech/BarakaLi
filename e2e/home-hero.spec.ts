import { expect, test } from '@playwright/test';
import { hasHorizontalScroll } from './helpers';
import { translator } from './i18n';

const t = translator('uz');
const SHOTS = process.env.E2E_SCREENSHOT_DIR;

test.describe('home hero (desktop 1280px)', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('shows the hero, both photos, the story and scrolls to the catalog', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(t('home.hero.title'));
    await expect(page.getByRole('main')).not.toContainText(/catering/i);
    const photo = page.getByRole('img', { name: t('home.hero.images.tikuvchilik') });
    await expect(photo).toBeVisible();
    await expect(page.getByRole('img', { name: t('home.hero.images.pishiriq') })).toBeVisible();
    await expect(page.getByText(t('home.hero.badge'))).toBeVisible();
    // Photos finish their entrance (translate back to 0) within a couple of seconds.
    await expect
      .poll(async () =>
        photo.evaluate((el) => {
          // img -> clipping box -> the wrapper framer-motion slides in from the right.
          const box = el.parentElement?.parentElement;
          return box ? getComputedStyle(box).transform : 'none';
        }),
      )
      .toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
    expect(await hasHorizontalScroll(page)).toBe(false);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/home-1280.png` });

    await page.getByRole('link', { name: t('home.hero.catalogCta') }).click();
    await expect
      .poll(async () =>
        page.locator('#katalog').evaluate((el) => Math.round(el.getBoundingClientRect().top)),
      )
      .toBeLessThanOrEqual(120);
    await expect(page.getByRole('heading', { name: /Nega aynan/ })).toBeVisible();
    if (SHOTS) {
      await page.locator('#home-why-title').scrollIntoViewIfNeeded();
      await page.waitForTimeout(1800);
      await page.screenshot({ path: `${SHOTS}/why-1280.png` });
    }
  });
});

for (const viewport of [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
]) {
  test.describe(`home without the hero (${viewport.name} ${viewport.width}px)`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test('keeps the plain catalog page and loads no motion chunk', async ({ page }) => {
      const scripts: string[] = [];
      page.on('response', (res) => {
        if (res.request().resourceType() === 'script') scripts.push(res.url());
      });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0);
      await expect(page.getByRole('search')).toBeVisible();
      await expect(page.getByText(t('home.becomeWorkerTitle'), { exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: /Nega aynan/ })).toHaveCount(0);
      expect(scripts.some((url) => /HomeLanding/.test(url))).toBe(false);
      expect(await hasHorizontalScroll(page)).toBe(false);
    });
  });
}
