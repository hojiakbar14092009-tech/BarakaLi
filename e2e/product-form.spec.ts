import { expect, test } from '@playwright/test';
import { becomeWorker, signIn, TINY_PNG } from './helpers';
import { translator } from './i18n';

const t = translator('uz');

test('uploading a photo, then a .glb, makes the viewer tabs appear on their own', async ({
  page,
  context,
  request,
}) => {
  const worker = await signIn(context, 'Shahnoza');
  await becomeWorker(request, worker, 'Shahnoza Usta');

  await page.goto('/ishlar');
  await page.getByRole('button', { name: t('cabinet.products.add') }).click();
  await page.getByLabel(t('cabinet.form.title')).fill(`Loy kosa ${Date.now() % 100_000}`);
  await page.getByLabel(t('cabinet.form.retailPrice')).fill('90000');
  await page.getByLabel(t('cabinet.form.stock')).fill('4');
  await page.getByRole('button', { name: t('cabinet.form.saveDraft'), exact: true }).click();
  await expect(page.getByText(t('cabinet.form.photoTip'))).toBeVisible();
  await expect(page.getByRole('tab', { name: t('product.tabRotate') })).toHaveCount(0);

  // A wrong file is refused before upload, with the fix in the message.
  await page
    .locator('#photo-input')
    .setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
  await expect(page.getByRole('alert')).toHaveText(t('errors.IMAGE_INVALID_FORMAT'));

  await page
    .locator('#photo-input')
    .setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: TINY_PNG });
  await expect(page.getByRole('tab', { name: t('product.tabRotate') })).toBeVisible();

  const listed = await request.get('/api/products?pageSize=20');
  const sample = ((await listed.json()) as { items: { model: { fileUrl: string } | null }[] }).items
    .map((item) => item.model)
    .find((model) => model !== null);
  const glb = Buffer.from(await (await request.get(sample?.fileUrl ?? '')).body());
  await page
    .locator('#model-input')
    .setInputFiles({ name: 'kosa.glb', mimeType: 'model/gltf-binary', buffer: glb });
  await expect(page.getByRole('tab', { name: t('product.tab3d') })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('tab', { name: t('product.tabRotate') })).toHaveCount(0);
});
