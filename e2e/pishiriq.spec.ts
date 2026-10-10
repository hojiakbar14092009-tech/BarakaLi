import { expect, test } from '@playwright/test';

test('Pishiriq lists no somsa, neither on the page nor through search', async ({
  page,
  request,
}) => {
  await page.goto('/xizmatlar/pishiriq');
  await expect(page.getByText(/^Topildi: \d+$/)).toBeVisible();
  await expect(page.getByRole('main')).not.toContainText(/s[ao]msa/i);

  for (const q of ['somsa', 'samsa']) {
    const res = await request.get(`/api/products?category=pishiriq&q=${q}`);
    expect(((await res.json()) as { total: number }).total, q).toBe(0);
  }
});
