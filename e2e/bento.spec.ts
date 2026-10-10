import { expect, test, type Page } from '@playwright/test';

const SHOTS = process.env.E2E_SCREENSHOT_DIR;

async function frames(page: Page) {
  await page.goto('/xizmatlar/barchasi');
  const cards = page.locator('main li[data-shape]');
  await expect(cards.first()).toBeVisible();
  return cards.evaluateAll((items) =>
    items.map((li) => {
      const frame = li.querySelector('[data-frame]') as HTMLElement;
      const img = frame.querySelector('img');
      const style = getComputedStyle(frame);
      return {
        shape: li.getAttribute('data-shape'),
        width: Math.round(li.getBoundingClientRect().width),
        radius: style.borderTopLeftRadius + ' ' + style.borderBottomLeftRadius,
        clip: style.clipPath,
        fit: img ? getComputedStyle(img).objectFit : 'contain',
      };
    }),
  );
}

test.describe('desktop bento cards (1280px)', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('cards take several shapes and sizes, never clip the image', async ({ page }) => {
    const info = await frames(page);
    expect(new Set(info.map((card) => card.radius)).size).toBeGreaterThanOrEqual(3);
    expect(new Set(info.map((card) => card.width)).size).toBeGreaterThanOrEqual(2);
    for (const card of info) {
      expect(card.clip).toBe('none');
      expect(card.fit).toBe('contain');
    }
    if (SHOTS) {
      await page.mouse.wheel(0, 900);
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${SHOTS}/bento-1280.png` });
    }
  });

  test('hover lifts the card', async ({ page }) => {
    await frames(page);
    const link = page.locator('main li[data-shape] a').first();
    await link.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    const before = await link.boundingBox();
    await link.hover();
    await page.waitForTimeout(300);
    const after = await link.boundingBox();
    expect((before?.y ?? 0) - (after?.y ?? 0)).toBeCloseTo(4, 0);
  });
});

for (const width of [768, 390]) {
  test.describe(`plain grid (${width}px)`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('every card has the same plain frame and width', async ({ page }) => {
      const info = await frames(page);
      expect(new Set(info.map((card) => card.radius)).size).toBe(1);
      expect(new Set(info.map((card) => card.width)).size).toBe(1);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/grid-${width}.png` });
    });
  });
}
