import { expect, test } from '@playwright/test';
import {
  ADMIN_PHONE,
  VIEWPORTS,
  addWindow,
  becomeWorker,
  hasHorizontalScroll,
  publishedProductId,
  signIn,
} from './helpers';

const MIN_TOUCH_TARGET = 48;

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name} ${viewport.width}px`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test('public pages have no horizontal scroll and 48px targets', async ({ page, request }) => {
      const productId = await publishedProductId(request);
      const workers = (await (await request.get('/api/workers/featured')).json()) as {
        id: string;
      }[];
      const routes = [
        '/',
        '/xizmatlar/tikuvchilik',
        `/mahsulot/${productId}`,
        `/hunarmand/${workers[0]?.id ?? ''}`,
        '/darslar',
        '/kirish',
        '/royxatdan-otish',
        '/savat',
        '/yoq-sahifa',
      ];
      for (const route of routes) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        expect(await hasHorizontalScroll(page), `${route} scrolls sideways`).toBe(false);
        const small = await page.evaluate((min) => {
          const targets = Array.from(
            document.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea'),
          );
          return targets
            .filter((el) => {
              const box = el.getBoundingClientRect();
              const style = getComputedStyle(el);
              const visible =
                box.width > 0 && style.visibility !== 'hidden' && style.display !== 'none';
              const hiddenInput = el.classList.contains('sr-only');
              // Inline links inside sentences are covered by their own min-h class.
              return visible && !hiddenInput && box.height < min - 0.5;
            })
            .map(
              (el) => `${el.tagName.toLowerCase()}:${(el.textContent ?? '').trim().slice(0, 30)}`,
            );
        }, MIN_TOUCH_TARGET);
        expect(small, `${route} has targets under ${MIN_TOUCH_TARGET}px`).toEqual([]);
      }
    });

    test('signed-in worker and customer pages stay within the screen', async ({
      page,
      context,
      request,
    }) => {
      const worker = await signIn(context, 'Mahsus Usta');
      const workerId = await becomeWorker(context.request, worker, 'Mahsus Usta');
      await addWindow(context.request, worker, 4);

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
        await expect(page.locator('h1').first()).toBeVisible();
        expect(await hasHorizontalScroll(page), `${route} scrolls sideways`).toBe(false);
      }

      const customer = await signIn(context, 'Mijoz Mijozov');
      expect(customer.userId).not.toBe(worker.userId);
      await page.goto(`/buyurtma/yangi?hunarmand=${workerId}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      expect(await hasHorizontalScroll(page)).toBe(false);
      await request.dispose();
    });

    test('admin panel tabs stay within the screen', async ({ page, context }) => {
      await signIn(context, 'Admin', ADMIN_PHONE);
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');
      for (const tab of ['Hunarmandlar', 'Buyurtmalar', 'Sharhlar', 'Shikoyatlar', 'Materiallar']) {
        await page.getByRole('tab', { name: tab }).click();
        await page.waitForLoadState('networkidle');
        expect(await hasHorizontalScroll(page)).toBe(false);
      }
    });
  });
}
