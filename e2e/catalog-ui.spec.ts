import { expect, test, type Locator } from '@playwright/test';
import { translator } from './i18n';

const t = translator('uz');
const ESPRESSO = 'rgb(57, 46, 38)';
const MOCHA = 'rgb(107, 91, 77)';

async function box(locator: Locator) {
  const b = await locator.boundingBox();
  expect(b).not.toBeNull();
  return b as { x: number; y: number; width: number; height: number };
}

test.describe('logo', () => {
  test('"Baraka" is Espresso Oak and "Li" is Mocha, in the same font and weight', async ({
    page,
  }) => {
    await page.goto('/');
    const logo = page.getByRole('banner').getByLabel('BarakaLi').first();
    const parts = await logo.locator('span > span').evaluateAll((spans) =>
      spans.map((el) => {
        const style = getComputedStyle(el);
        return {
          text: el.textContent,
          color: style.color,
          weight: style.fontWeight,
          family: style.fontFamily,
        };
      }),
    );
    expect(parts.map((p) => p.text)).toEqual(['Baraka', 'Li']);
    expect(parts[0]?.color).toBe(ESPRESSO);
    expect(parts[1]?.color).toBe(MOCHA);
    expect(parts[0]?.weight).toBe(parts[1]?.weight);
    expect(parts[0]?.family).toBe(parts[1]?.family);
  });
});

for (const viewport of [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'phone', width: 390, height: 844 },
]) {
  test.describe(`catalog search (${viewport.name} ${viewport.width}px)`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test('the field does not move while typing or when results appear', async ({ page }) => {
      await page.goto('/xizmatlar/barchasi');
      await page.waitForLoadState('networkidle');
      const input = page.getByRole('searchbox', { name: t('catalog.searchLabel') });
      const icon = page.getByRole('search').locator('svg').first();
      const before = await box(input);
      expect(before.height).toBeCloseTo(48, 0);

      await input.pressSequentially('sav');
      const typing = await box(input);
      await input.press('Enter');
      await page.waitForLoadState('networkidle');
      await expect(page.getByText(/^Topildi: \d+$/)).toBeVisible();
      const after = await box(input);
      for (const b of [typing, after]) {
        expect(b.x).toBeCloseTo(before.x, 0);
        expect(b.y).toBeCloseTo(before.y, 0);
        expect(b.height).toBeCloseTo(before.height, 0);
      }

      const iconBox = await box(icon);
      const iconCentre = iconBox.y + iconBox.height / 2;
      expect(Math.abs(iconCentre - (after.y + after.height / 2))).toBeLessThanOrEqual(1);
      expect(iconBox.x - after.x).toBeCloseTo(16, 0);
    });

    test('the sort control matches the field and has no visible label', async ({ page }) => {
      await page.goto('/xizmatlar/barchasi');
      const sort = page.getByRole('combobox', { name: t('catalog.sortLabel') });
      const input = page.getByRole('searchbox', { name: t('catalog.searchLabel') });
      const [sortBox, inputBox] = [await box(sort), await box(input)];
      expect(sortBox.height).toBeCloseTo(inputBox.height, 0);
      await expect(page.getByText(t('catalog.sortLabel'), { exact: true })).toHaveCount(0);
      if (viewport.width >= 768) {
        expect(sortBox.y).toBeCloseTo(inputBox.y, 0);
      } else {
        expect(sortBox.y - (inputBox.y + inputBox.height)).toBeCloseTo(12, 0);
        expect(sortBox.width).toBeCloseTo(inputBox.width, 0);
      }
    });
  });
}

for (const viewport of [
  { width: 390, height: 844, columns: 2, imageHeight: 200 },
  { width: 768, height: 1024, columns: 3, imageHeight: 200 },
]) {
  test.describe(`compact product cards (${viewport.width}px)`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test('fixed image frame, single-line text, whole card is one link', async ({ page }) => {
      await page.goto('/xizmatlar/barchasi');
      const cards = page
        .getByRole('main')
        .getByRole('listitem')
        .filter({ has: page.locator('h3') });
      await expect(cards.first()).toBeVisible();
      const first = cards.first();
      await expect(first.getByRole('link')).toHaveCount(1);
      await expect(first.getByRole('button')).toHaveCount(0);

      const image = first.getByRole('img').first();
      expect((await box(image)).height).toBeCloseTo(viewport.imageHeight, 0);
      const fit = await image.evaluate((el) => getComputedStyle(el).objectFit);
      if (fit) expect(['contain', 'fill']).toContain(fit);

      const title = first.locator('h3');
      const lineHeight = await title.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));
      expect((await box(title)).height).toBeLessThanOrEqual(lineHeight + 1);

      const tops = await cards.evaluateAll((items) =>
        items.slice(0, 6).map((el) => Math.round(el.getBoundingClientRect().top)),
      );
      expect(tops.filter((top) => top === tops[0])).toHaveLength(viewport.columns);
    });
  });
}
