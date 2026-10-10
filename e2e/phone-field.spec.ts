import { expect, test } from '@playwright/test';
import { VIEWPORTS } from './helpers';
import { translator } from './i18n';

const t = translator('uz');

for (const viewport of VIEWPORTS) {
  test.describe(`phone field (${viewport.name} ${viewport.width}px)`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test('label and field share one left edge and the box is 48 px tall', async ({ page }) => {
      await page.goto('/kirish');
      const label = page.locator('label', { hasText: t('auth.phoneLabel') });
      const group = page.locator('[data-phone-field]');
      const input = page.getByLabel(t('auth.phoneLabel'));
      const [labelBox, groupBox, inputBox] = await Promise.all([
        label.boundingBox(),
        group.boundingBox(),
        input.boundingBox(),
      ]);
      expect(labelBox && groupBox && inputBox).toBeTruthy();
      expect(Math.abs((labelBox?.x ?? 0) - (groupBox?.x ?? 99))).toBeLessThanOrEqual(0.5);
      expect(groupBox?.height).toBeGreaterThanOrEqual(47.5);
      expect(groupBox?.height).toBeLessThanOrEqual(48.5);
      // the prefix sits inside the same box, to the left of the number
      const prefix = group.getByText('+998');
      const prefixBox = await prefix.boundingBox();
      expect(prefixBox?.x).toBeGreaterThanOrEqual((groupBox?.x ?? 0) - 0.5);
      expect(prefixBox?.x ?? 0).toBeLessThan(inputBox?.x ?? 0);
      const size = await input.evaluate((el) => getComputedStyle(el).fontSize);
      expect(size).toBe('16px');
    });

    test('is full width on a phone', async ({ page }) => {
      test.skip(viewport.width !== 360, 'phone width only');
      await page.goto('/kirish');
      const group = await page.locator('[data-phone-field]').boundingBox();
      const form = await page.locator('form').first().boundingBox();
      expect(Math.abs((group?.width ?? 0) - (form?.width ?? 1))).toBeLessThanOrEqual(1);
    });

    test('formats while typing and explains a short number', async ({ page }) => {
      await page.goto('/kirish');
      const input = page.getByLabel(t('auth.phoneLabel'));
      await input.fill('');
      await input.pressSequentially('901234567');
      await expect(input).toHaveValue('90 123 45 67');
      await input.blur();
      await expect(page.getByRole('alert')).toHaveCount(0);

      await input.fill('');
      await input.pressSequentially('9012');
      await input.blur();
      await expect(page.getByText(t('validation.INVALID_PHONE'))).toBeVisible();
      await expect(input).toHaveAttribute('aria-invalid', 'true');
    });
  });
}
