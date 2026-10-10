import { expect, test } from '@playwright/test';
import { translator } from './i18n';

const t = translator('uz');

interface ListedProduct {
  id: string;
  title: string;
  images: unknown[];
  model: unknown;
}

test.describe('product viewer tab', () => {
  test('every product with a photo has a viewer tab next to "Rasmlar"', async ({
    page,
    request,
  }) => {
    const res = await request.get('/api/products?pageSize=20');
    const items = ((await res.json()) as { items: ListedProduct[] }).items;
    const withPhotos = items.filter((item) => item.images.length > 0);
    expect(withPhotos.length).toBeGreaterThan(0);
    for (const product of withPhotos) {
      await page.goto(`/mahsulot/${product.id}`);
      await expect(page.getByRole('tab', { name: t('product.tabPhotos') })).toBeVisible();
      const viewerTab = product.model ? t('product.tab3d') : t('product.tabRotate');
      await expect(page.getByRole('tab', { name: viewerTab }), product.title).toBeVisible();
    }
  });

  test('the rotate view turns with the mouse and the keyboard, never called 3D', async ({
    page,
    request,
  }) => {
    const res = await request.get('/api/products?pageSize=20');
    const items = ((await res.json()) as { items: ListedProduct[] }).items;
    const plain = items.find((item) => !item.model && item.images.length > 0);
    await page.goto(`/mahsulot/${plain?.id ?? ''}`);
    const photos = page.getByRole('tab', { name: t('product.tabPhotos') });
    const rotateTab = page.getByRole('tab', { name: t('product.tabRotate') });
    await expect(rotateTab).not.toContainText('3D');

    await photos.focus();
    await page.keyboard.press('ArrowRight');
    await expect(rotateTab).toHaveAttribute('aria-selected', 'true');
    await expect(rotateTab).toBeFocused();
    await expect(photos).toHaveAttribute('aria-selected', 'false');

    const viewer = page.locator('[data-rotate-viewer]');
    const image = viewer.locator('img');
    expect(await viewer.evaluate((el) => getComputedStyle(el).touchAction)).toBe('none');
    const height = (await viewer.boundingBox())?.height ?? 0;
    expect(height).toBeLessThanOrEqual((page.viewportSize()?.height ?? 0) * 0.6 + 1);

    const box = await viewer.boundingBox();
    const [x, y] = [(box?.x ?? 0) + 100, (box?.y ?? 0) + 100];
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 60, y, { steps: 5 });
    await page.mouse.up();
    await expect(image).toHaveAttribute('data-angle', '21,0');

    await viewer.focus();
    await page.keyboard.press('Home');
    await expect(image).toHaveAttribute('data-angle', '0,0');
    await page.keyboard.press('ArrowLeft');
    await expect(image).toHaveAttribute('data-angle', '-10,0');
  });
});
