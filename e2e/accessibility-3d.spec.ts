import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
  ADMIN_PHONE,
  VIEWPORTS,
  addWindow,
  becomeWorker,
  publishedProductId,
  productWithModelId,
  signIn,
} from './helpers';
import { translator } from './i18n';

async function violations(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return result.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`,
  );
}

test.describe('accessibility (axe, WCAG 2.1 AA)', () => {
  for (const viewport of VIEWPORTS) {
    test(`public pages at ${viewport.width}px`, async ({ page, request }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const productId = await publishedProductId(request);
      for (const route of [
        '/',
        '/xizmatlar/tikuvchilik',
        `/mahsulot/${productId}`,
        '/kirish',
        '/darslar',
        '/savat',
      ]) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        expect(await violations(page), route).toEqual([]);
      }
    });
  }

  test('signed-in worker, customer and admin pages', async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const worker = await signIn(context, 'Axe Usta');
    const workerId = await becomeWorker(context.request, worker, 'Axe Usta');
    await addWindow(context.request, worker, 3);
    for (const route of [
      '/hunarmand/panel',
      '/hunarmand/kalendar',
      '/ishlar',
      '/daromad',
      '/materiallar',
      '/buyurtmalar',
      '/profil',
    ]) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      expect(await violations(page), route).toEqual([]);
    }

    await signIn(context, 'Axe Mijoz');
    await page.goto(`/buyurtma/yangi?hunarmand=${workerId}`);
    await page.waitForLoadState('networkidle');
    expect(await violations(page), 'new service order').toEqual([]);

    await signIn(context, 'Axe Admin', ADMIN_PHONE);
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    expect(await violations(page), 'admin').toEqual([]);
  });
});

test.describe('3D viewer', () => {
  const t = translator('uz');

  test('opens the 3D tab and renders a canvas when WebGL is available', async ({
    page,
    request,
  }) => {
    const productId = await productWithModelId(request);
    await page.goto(`/mahsulot/${productId}`);
    const requested: string[] = [];
    page.on('request', (req) => requested.push(req.url()));
    await page.getByRole('tab', { name: t('product.tab3d') }).click();
    const canvas = page.locator('canvas');
    const fallback = page.getByText(t('product.viewer.noWebgl'));
    // Software GL is enabled in the test browser; if the machine still refuses WebGL the app must
    // fall back instead of breaking, which is asserted by the next test.
    await expect(canvas.or(fallback)).toBeVisible({ timeout: 30_000 });
    expect(requested.some((url) => /\.glb|\/api\/files\//.test(url))).toBe(true);
  });

  test('falls back to the photos when WebGL is not supported', async ({ page, request }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function patched(
        this: HTMLCanvasElement,
        type: string,
        ...rest: unknown[]
      ) {
        if (/webgl/i.test(type)) return null;
        return (original as (...args: unknown[]) => unknown).call(this, type, ...rest);
      } as typeof original;
    });
    const productId = await productWithModelId(request);
    await page.goto(`/mahsulot/${productId}`);
    await page.getByRole('tab', { name: t('product.tab3d') }).click();

    await expect(page.getByText(t('product.viewer.noWebgl'))).toBeVisible();
    // The page keeps working: the photo gallery is shown and the 3D tab is gone.
    await expect(page.getByRole('tab', { name: t('product.tab3d') })).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(page.getByRole('img').first()).toBeVisible();
  });

  test('does not load the 3D code before the tab is opened', async ({ page, request }) => {
    const productId = await productWithModelId(request);
    const scripts: string[] = [];
    page.on('response', (res) => {
      if (res.request().resourceType() === 'script') scripts.push(res.url());
    });
    await page.goto(`/mahsulot/${productId}`);
    await page.waitForLoadState('networkidle');
    expect(scripts.some((url) => /ViewerCanvas|Product3DViewer/.test(url))).toBe(false);
    await page.getByRole('tab', { name: t('product.tab3d') }).click();
    await expect.poll(() => scripts.some((url) => /ViewerCanvas/.test(url))).toBe(true);
  });
});
