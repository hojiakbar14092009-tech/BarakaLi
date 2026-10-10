import { gzipSync } from 'node:zlib';
import { chromium, expect, test } from '@playwright/test';
import lighthouse from 'lighthouse';
import { productWithModelId } from './helpers';

const DEBUG_PORT = 9333;
const FIRST_SCREEN_BUDGET_MS = 3000;
const HOME_JS_BUDGET_BYTES = 200 * 1024;

interface NetworkItem {
  url: string;
  resourceType?: string;
}

/**
 * Lighthouse mobile preset (simulated Slow 4G, 4x CPU slowdown) against the production build.
 * The numbers are lab estimates from a local machine, not field data.
 */
test.describe('lighthouse (mobile, slow 4G)', () => {
  test.setTimeout(240_000);

  async function audit(url: string, categories: string[]) {
    const browser = await chromium.launch({
      args: [`--remote-debugging-port=${DEBUG_PORT}`, '--headless=new'],
    });
    try {
      const result = await lighthouse(url, {
        port: DEBUG_PORT,
        output: 'json',
        logLevel: 'error',
        onlyCategories: categories,
      });
      if (!result) throw new Error('Lighthouse returned no result');
      return result.lhr;
    } finally {
      await browser.close();
    }
  }

  test('home page paints the first screen within 3 seconds and keeps JS under budget', async ({
    baseURL,
    request,
  }) => {
    const lhr = await audit(`${baseURL}/`, ['performance', 'accessibility', 'best-practices']);
    const metric = (id: string) => lhr.audits[id]?.numericValue ?? Number.POSITIVE_INFINITY;
    const fcp = metric('first-contentful-paint');
    const lcp = metric('largest-contentful-paint');
    test.info().annotations.push({
      type: 'lighthouse',
      description: `FCP ${Math.round(fcp)} ms, LCP ${Math.round(lcp)} ms, TBT ${Math.round(
        metric('total-blocking-time'),
      )} ms, CLS ${metric('cumulative-layout-shift').toFixed(3)}, performance ${Math.round(
        (lhr.categories.performance?.score ?? 0) * 100,
      )}, accessibility ${Math.round((lhr.categories.accessibility?.score ?? 0) * 100)}`,
    });
    // eslint-disable-next-line no-console -- the report is the purpose of this run
    console.log(
      `LIGHTHOUSE home: FCP ${Math.round(fcp)} ms, LCP ${Math.round(lcp)} ms, TBT ${Math.round(
        metric('total-blocking-time'),
      )} ms, CLS ${metric('cumulative-layout-shift').toFixed(3)}, performance ${Math.round(
        (lhr.categories.performance?.score ?? 0) * 100,
      )}, accessibility ${Math.round((lhr.categories.accessibility?.score ?? 0) * 100)}`,
    );
    expect(fcp).toBeLessThan(FIRST_SCREEN_BUDGET_MS);
    expect(lcp).toBeLessThan(FIRST_SCREEN_BUDGET_MS);
    expect(lhr.categories.accessibility?.score ?? 0).toBeGreaterThanOrEqual(0.95);

    // The preview server sends files uncompressed, so JS is measured as gzip like production hosting.
    const items = (lhr.audits['network-requests']?.details as { items?: NetworkItem[] } | undefined)
      ?.items;
    const scripts = (items ?? []).filter((item) => item.resourceType === 'Script');
    expect(scripts.length).toBeGreaterThan(0);
    let gzipBytes = 0;
    for (const script of scripts) {
      const body = await (await request.get(script.url)).body();
      gzipBytes += gzipSync(body).length;
    }
    // eslint-disable-next-line no-console -- the report is the purpose of this run
    console.log(`LIGHTHOUSE home JS: ${(gzipBytes / 1024).toFixed(1)} KB gzip`);
    expect(gzipBytes).toBeLessThanOrEqual(HOME_JS_BUDGET_BYTES);
    expect(scripts.some((item) => /ViewerCanvas|Product3DViewer/.test(item.url))).toBe(false);
  });

  test('product page does not pull in the 3D code', async ({ baseURL, request }) => {
    const productId = await productWithModelId(request);
    const lhr = await audit(`${baseURL}/mahsulot/${productId}`, ['performance']);
    const items = (lhr.audits['network-requests']?.details as { items?: NetworkItem[] } | undefined)
      ?.items;
    const scripts = (items ?? []).filter((item) => item.resourceType === 'Script');
    expect(scripts.some((item) => /ViewerCanvas|Product3DViewer/.test(item.url))).toBe(false);
    const lcp = lhr.audits['largest-contentful-paint']?.numericValue ?? Number.POSITIVE_INFINITY;
    // eslint-disable-next-line no-console -- the report is the purpose of this run
    console.log(`LIGHTHOUSE product: LCP ${Math.round(lcp)} ms`);
  });
});
