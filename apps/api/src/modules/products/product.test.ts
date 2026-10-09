import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MAX_MODEL_BYTES, MAX_PRODUCT_IMAGES } from '@barakali/shared';
import {
  createTestApp,
  makeProduct,
  makeWorker,
  login,
  pngBuffer,
  type TestApp,
} from '../../testing/helpers.js';
import { buildVaseGlb } from '../uploads/glb-fixture.js';

let t: TestApp;
let owner: Awaited<ReturnType<typeof makeWorker>>;
let other: Awaited<ReturnType<typeof makeWorker>>;
let glb: Buffer;

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Re-packs a GLB after editing its JSON chunk, keeping the BIN chunk intact. */
function rewriteJson(source: Buffer, edit: (json: Record<string, unknown>) => void): Buffer {
  const jsonLength = source.readUInt32LE(12);
  const json = JSON.parse(source.subarray(20, 20 + jsonLength).toString('utf8')) as Record<
    string,
    unknown
  >;
  edit(json);
  let text = JSON.stringify(json);
  while (text.length % 4 !== 0) text += ' ';
  const body = Buffer.from(text, 'utf8');
  const rest = source.subarray(20 + jsonLength);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(20 + body.length + rest.length, 8);
  header.writeUInt32LE(body.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  return Buffer.concat([header, body, rest]);
}

beforeAll(async () => {
  t = await createTestApp();
  owner = await makeWorker(t, 'Egasi');
  other = await makeWorker(t, 'Boshqa');
  glb = await buildVaseGlb();
});
afterAll(() => t.close());

describe('product ownership', () => {
  it('lets a customer without a worker profile nowhere near the cabinet', async () => {
    const customer = await login(t.app);
    const res = await request(t.app).get('/api/my/products').set(bearer(customer.token));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('WORKER_REQUIRED');
    expect((await request(t.app).get('/api/my/products')).status).toBe(401);
  });

  it("forbids editing, deleting and uploading to another worker's product", async () => {
    const product = await makeProduct(t, owner);
    const body = {
      title: 'Hijack',
      categoryId: product.categoryId,
      retailPrice: 1000,
      stock: 1,
      status: 'published',
    };
    const put = await request(t.app)
      .put(`/api/my/products/${product.id}`)
      .set(bearer(other.token))
      .send(body);
    expect(put.status).toBe(403);
    const del = await request(t.app)
      .delete(`/api/my/products/${product.id}`)
      .set(bearer(other.token));
    expect(del.status).toBe(403);
    const stock = await request(t.app)
      .patch(`/api/my/products/${product.id}/stock`)
      .set(bearer(other.token))
      .send({ stock: 0 });
    expect(stock.status).toBe(403);
    const model = await request(t.app)
      .put(`/api/my/products/${product.id}/model`)
      .set(bearer(other.token))
      .attach('model', glb, 'a.glb');
    expect(model.status).toBe(403);
  });

  it('shows a worker only their own products in the cabinet', async () => {
    await makeProduct(t, other, { title: 'Faqat boshqa' });
    const mine = await request(t.app).get('/api/my/products').set(bearer(owner.token));
    expect(mine.body.map((p: { title: string }) => p.title)).not.toContain('Faqat boshqa');
  });
});

describe('product CRUD', () => {
  it('creates drafts, updates, adjusts stock and deletes', async () => {
    const draft = await makeProduct(t, owner, { title: 'Pichoq', publish: false });
    expect(draft.status).toBe('draft');
    const updated = await request(t.app)
      .put(`/api/my/products/${draft.id}`)
      .set(bearer(owner.token))
      .send({
        title: 'Pichoq 2',
        categoryId: draft.categoryId,
        retailPrice: 20_000,
        stock: 3,
        status: 'draft',
      });
    expect(updated.body).toMatchObject({ title: 'Pichoq 2', retailPrice: 20_000 });
    const stock = await request(t.app)
      .patch(`/api/my/products/${draft.id}/stock`)
      .set(bearer(owner.token))
      .send({ stock: 7 });
    expect(stock.body.stock).toBe(7);
    const del = await request(t.app)
      .delete(`/api/my/products/${draft.id}`)
      .set(bearer(owner.token));
    expect(del.status).toBe(204);
  });

  it('refuses to publish a product without an image', async () => {
    const draft = await makeProduct(t, owner, { publish: false });
    const res = await request(t.app)
      .patch(`/api/my/products/${draft.id}/status`)
      .set(bearer(owner.token))
      .send({ status: 'published' });
    expect(res.status).toBe(400);
  });

  it('validates wholesale terms on the server', async () => {
    const category = (await makeProduct(t, owner, { publish: false })).categoryId;
    const res = await request(t.app).post('/api/my/products').set(bearer(owner.token)).send({
      title: 'Bad',
      categoryId: category,
      retailPrice: 10_000,
      wholesalePrice: 12_000,
      wholesaleMinQty: 5,
      stock: 1,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('image upload', () => {
  it('re-encodes images to WebP and serves them with long-lived cache headers', async () => {
    const product = await makeProduct(t, owner, { publish: false });
    const res = await request(t.app)
      .post(`/api/my/products/${product.id}/images`)
      .set(bearer(owner.token))
      .attach('image', await pngBuffer(), { filename: 'x.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    const url = res.body.images[0].url as string;
    expect(url).toMatch(/^\/api\/files\/[a-f0-9-]{36}\.webp$/);
    const file = await request(t.app).get(url);
    expect(file.headers['content-type']).toBe('image/webp');
    expect(file.headers['cache-control']).toContain('immutable');
    expect(file.headers['x-content-type-options']).toBe('nosniff');
  });

  it('checks the real content, not the declared type', async () => {
    const product = await makeProduct(t, owner, { publish: false });
    const res = await request(t.app)
      .post(`/api/my/products/${product.id}/images`)
      .set(bearer(owner.token))
      .attach('image', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), {
        filename: 'x.png',
        contentType: 'image/png',
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('IMAGE_INVALID_FORMAT');
  });

  it('rejects files above 5 MB and a missing file', async () => {
    const product = await makeProduct(t, owner, { publish: false });
    const big = await request(t.app)
      .post(`/api/my/products/${product.id}/images`)
      .set(bearer(owner.token))
      .attach('image', Buffer.alloc(5 * 1024 * 1024 + 10), 'big.png');
    expect(big.status).toBe(413);
    expect(big.body.error.code).toBe('IMAGE_TOO_LARGE');
    const none = await request(t.app)
      .post(`/api/my/products/${product.id}/images`)
      .set(bearer(owner.token));
    expect(none.body.error.code).toBe('UPLOAD_MISSING_FILE');
  });

  it(`allows at most ${MAX_PRODUCT_IMAGES} images`, async () => {
    const product = await makeProduct(t, owner, { publish: false });
    const png = await pngBuffer(8, 8);
    for (let i = 0; i < MAX_PRODUCT_IMAGES; i += 1) {
      const ok = await request(t.app)
        .post(`/api/my/products/${product.id}/images`)
        .set(bearer(owner.token))
        .attach('image', png, 'a.png');
      expect(ok.status).toBe(201);
    }
    const extra = await request(t.app)
      .post(`/api/my/products/${product.id}/images`)
      .set(bearer(owner.token))
      .attach('image', png, 'a.png');
    expect(extra.status).toBe(409);
    expect(extra.body.error.code).toBe('IMAGE_LIMIT_REACHED');
  });
});

describe('3D model upload', () => {
  const upload = (productId: string, data: Buffer) =>
    request(t.app)
      .put(`/api/my/products/${productId}/model`)
      .set(bearer(owner.token))
      .attach('model', data, { filename: 'x.glb', contentType: 'model/gltf-binary' });

  it('accepts a valid .glb, serves it as model/gltf-binary and exposes the poster', async () => {
    const product = await makeProduct(t, owner);
    const res = await upload(product.id, glb);
    expect(res.status).toBe(200);
    expect(res.body.model.fileUrl).toMatch(/\.glb$/);
    expect(res.body.model.posterUrl).toBe(res.body.images[0].url);
    const file = await request(t.app).get(res.body.model.fileUrl);
    expect(file.headers['content-type']).toBe('model/gltf-binary');
  });

  it('replaces and removes the model', async () => {
    const product = await makeProduct(t, owner);
    const first = await upload(product.id, glb);
    const second = await upload(product.id, glb);
    expect(second.body.model.fileUrl).not.toBe(first.body.model.fileUrl);
    expect((await request(t.app).get(first.body.model.fileUrl)).status).toBe(404);
    const removed = await request(t.app)
      .delete(`/api/my/products/${product.id}/model`)
      .set(bearer(owner.token));
    expect(removed.body.model).toBeNull();
  });

  it('rejects files that are not glTF binaries', async () => {
    const product = await makeProduct(t, owner);
    const res = await upload(product.id, Buffer.from('not a model at all, just text content'));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MODEL_INVALID_FORMAT');
  });

  it('rejects a model above 10 MB', async () => {
    const product = await makeProduct(t, owner);
    const res = await upload(product.id, Buffer.alloc(MAX_MODEL_BYTES + 1024));
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('MODEL_TOO_LARGE');
  });

  it('rejects a truncated or corrupted glTF', async () => {
    const product = await makeProduct(t, owner);
    const truncated = await upload(product.id, glb.subarray(0, glb.length - 40));
    expect(truncated.status).toBe(400);
    expect(truncated.body.error.code).toBe('MODEL_INVALID_CONTENT');
    const brokenJson = Buffer.from(glb);
    brokenJson.write('{{{{', 20);
    expect((await upload(product.id, brokenJson)).body.error.code).toBe('MODEL_INVALID_CONTENT');
  });

  it('rejects external URIs and forbidden extensions', async () => {
    const product = await makeProduct(t, owner);
    const external = rewriteJson(glb, (json) => {
      (json.buffers as { uri?: string }[])[0]!.uri = 'https://evil.example/data.bin';
    });
    expect((await upload(product.id, external)).body.error.code).toBe('MODEL_INVALID_CONTENT');
    const extension = rewriteJson(glb, (json) => {
      json.extensionsUsed = ['KHR_materials_unlit', 'VENDOR_evil_extension'];
    });
    expect((await upload(product.id, extension)).body.error.code).toBe('MODEL_INVALID_CONTENT');
    const allowed = rewriteJson(glb, (json) => {
      json.extensionsUsed = ['KHR_materials_unlit'];
    });
    expect((await upload(product.id, allowed)).status).toBe(200);
  });

  it('rejects models with more than 200 000 triangles', async () => {
    const product = await makeProduct(t, owner);
    const heavy = rewriteJson(glb, (json) => {
      const accessors = json.accessors as { count: number }[];
      for (const accessor of accessors) accessor.count = 700_000;
    });
    const res = await upload(product.id, heavy);
    expect(res.body.error.code).toMatch(/MODEL_LIMIT_EXCEEDED|MODEL_INVALID_CONTENT/);
    expect(res.status).toBe(400);
  });

  it('rejects glTF 1.0 containers', async () => {
    const product = await makeProduct(t, owner);
    const legacy = Buffer.from(glb);
    legacy.writeUInt32LE(1, 4);
    expect((await upload(product.id, legacy)).body.error.code).toBe('MODEL_INVALID_FORMAT');
  });
});
