import { randomUUID } from 'node:crypto';
import type { Db } from './client.js';
import { DbStorageProvider } from '../infra/storage.js';
import { buildVaseGlb } from '../modules/uploads/glb-fixture.js';
import { MODEL_MIME_TYPE } from '@barakali/shared';

interface SeedProduct {
  title: string;
  description: string;
  retailPrice: number;
  wholesalePrice?: number;
  wholesaleMinQty?: number;
  stock: number;
  /** File name (without extension) under apps/web/public/products/; absent while the photo is awaited. */
  photo?: string;
  model?: [number, number, number];
}

interface SeedWorker {
  phone: string;
  name: string;
  category: string;
  bio: string;
  verified: boolean;
  rating: number;
  reviews: number;
  products: SeedProduct[];
}

const WORKERS: SeedWorker[] = [
  {
    phone: '+998900000001',
    name: 'Dilfuza Karimova',
    category: 'tikuvchilik',
    bio: 'Atlas va adras matolaridan milliy libos va uy-roʻzgʻor buyumlari tikaman. 12 yillik tajriba.',
    verified: true,
    rating: 4.9,
    reviews: 38,
    products: [
      {
        title: 'Ikat adras koʻylak',
        photo: 'ikat-xalat',
        description:
          'Qoʻlda tanlangan adras matosidan tikilgan koʻylak. Oʻlcham buyurtmaga qarab oʻzgartiriladi.',
        retailPrice: 420_000,
        stock: 6,
      },
      {
        title: 'Kashta ilingan sumka',
        photo: 'kashta-sumka',
        description: 'Suzani naqshli, astarli kundalik sumka. Ichida cho‘ntagi bor.',
        retailPrice: 95_000,
        wholesalePrice: 80_000,
        wholesaleMinQty: 10,
        stock: 40,
      },
      {
        title: 'Bolalar uchun paxtali kombinezon',
        photo: 'bolalar-kombinezon',
        description: 'Yumshoq paxta, 1–3 yosh uchun. Tugmalari xavfsiz mahkamlangan.',
        retailPrice: 130_000,
        wholesalePrice: 110_000,
        wholesaleMinQty: 5,
        stock: 25,
      },
    ],
  },
  {
    phone: '+998900000002',
    name: 'Madina Yusupova',
    category: 'pishiriq',
    bio: 'Uyda pishirilgan tortlar va xamir ovqatlar. Faqat tabiiy mahsulotlardan.',
    verified: true,
    rating: 4.8,
    reviews: 61,
    products: [
      {
        title: 'Medovik tort (1 kg)',
        photo: 'asal-tort',
        description: 'Asalli qatlamli klassik tort, qaymoqli krem bilan. Bayramlar uchun.',
        retailPrice: 180_000,
        stock: 8,
      },
      {
        title: 'Yong‘oqli pakhlava',
        photo: 'baklava',
        description: 'Yupqa qatlamli, yong‘oq va asalli pakhlava. 500 g quti.',
        retailPrice: 85_000,
        wholesalePrice: 72_000,
        wholesaleMinQty: 6,
        stock: 30,
      },
    ],
  },
  {
    phone: '+998900000003',
    name: 'Zulfiya Rahimova',
    category: 'qol-mehnati',
    bio: 'Sopol, kashta va toʻqima buyumlar. Har bir ish qoʻlda tayyorlanadi.',
    verified: true,
    rating: 4.7,
    reviews: 24,
    products: [
      {
        title: 'Sopol vaza (qoʻlda yasalgan)',
        photo: 'sopol-vaza',
        description: 'Oʻrta hajmli sopol vaza. 3D koʻrinishda aylantirib koʻring.',
        retailPrice: 150_000,
        wholesalePrice: 125_000,
        wholesaleMinQty: 4,
        stock: 12,
        model: [0.72, 0.5, 0.36],
      },
      {
        title: 'Suzani yostiq jildi',
        photo: 'suzani-yostiq-jildi',
        description: 'Qoʻlda kashta qilingan, 45×45 sm yostiq jildi.',
        retailPrice: 110_000,
        stock: 15,
      },
      {
        title: 'Toʻqilgan savat',
        photo: 'toqilgan-savat',
        description: 'Tabiiy tolalardan toʻqilgan, uy-roʻzgʻor uchun mustahkam savat.',
        retailPrice: 70_000,
        wholesalePrice: 58_000,
        wholesaleMinQty: 8,
        stock: 22,
      },
    ],
  },
  {
    phone: '+998900000004',
    name: 'Nigora Abdullayeva',
    category: 'dizayn',
    bio: 'Taklifnoma, vizitka va kichik biznes uchun bosma materiallar dizayni.',
    verified: false,
    rating: 4.6,
    reviews: 9,
    products: [
      {
        title: 'Toʻy taklifnomalari (50 dona)',
        description: 'Individual dizayn va bosmaga tayyor taklifnoma toʻplami.',
        retailPrice: 250_000,
        stock: 10,
      },
    ],
  },
];

/** Served by the web app as a static file, so the API never has to store or stream it. */
function photoUrls(product: SeedProduct): string[] {
  return product.photo ? [`/products/${product.photo}.webp`] : [];
}

/**
 * Databases seeded before real photos existed hold generated placeholder images; this swaps them for
 * the photos, idempotently, matching sample products by their worker's number and title.
 */
async function syncSamplePhotos(db: Db): Promise<number> {
  let updated = 0;
  for (const worker of WORKERS) {
    for (const product of worker.products) {
      const row = await db
        .selectFrom('products as p')
        .innerJoin('workers as w', 'w.id', 'p.worker_id')
        .innerJoin('users as u', 'u.id', 'w.user_id')
        .select('p.id')
        .where('u.phone', '=', worker.phone)
        .where('p.title', '=', product.title)
        .executeTakeFirst();
      if (!row) continue;
      const urls = photoUrls(product);
      const images = await db
        .selectFrom('product_images')
        .select('url')
        .where('product_id', '=', row.id)
        .orderBy('position')
        .execute();
      if (images.map((image) => image.url).join() === urls.join()) continue;
      await db.transaction().execute(async (trx) => {
        await trx.deleteFrom('product_images').where('product_id', '=', row.id).execute();
        if (urls.length > 0) {
          await trx
            .insertInto('product_images')
            .values(urls.map((url, position) => ({ product_id: row.id, url, position })))
            .execute();
        }
        await trx
          .updateTable('product_models')
          .set({ poster_url: urls[0] ?? null })
          .where('product_id', '=', row.id)
          .execute();
      });
      updated += 1;
    }
  }
  return updated;
}

async function categoryIds(db: Db): Promise<Map<string, string>> {
  const rows = await db.selectFrom('categories').select(['id', 'slug']).execute();
  return new Map(rows.map((row) => [row.slug, row.id]));
}

async function seedWorker(
  db: Db,
  storage: DbStorageProvider,
  seed: SeedWorker,
  categories: Map<string, string>,
) {
  const categoryId = categories.get(seed.category);
  if (!categoryId) throw new Error(`Unknown category ${seed.category}`);
  const user = await db
    .insertInto('users')
    .values({ phone: seed.phone, name: seed.name, role: 'worker' })
    .returning('id')
    .executeTakeFirstOrThrow();
  const worker = await db
    .insertInto('workers')
    .values({
      user_id: user.id,
      category_id: categoryId,
      display_name: seed.name,
      bio: seed.bio,
      avatar_url: null,
      rating: seed.rating,
      reviews_count: seed.reviews,
      status: 'approved',
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  for (const product of seed.products) {
    await seedProduct(db, storage, worker.id, categoryId, product);
  }
}

async function seedProduct(
  db: Db,
  storage: DbStorageProvider,
  workerId: string,
  categoryId: string,
  product: SeedProduct,
) {
  const row = await db
    .insertInto('products')
    .values({
      worker_id: workerId,
      category_id: categoryId,
      title: product.title,
      description: product.description,
      retail_price: product.retailPrice,
      wholesale_price: product.wholesalePrice ?? null,
      wholesale_min_qty: product.wholesaleMinQty ?? null,
      stock: product.stock,
      status: 'published',
      updated_at: new Date(),
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  const urls = photoUrls(product);
  if (urls.length > 0) {
    await db
      .insertInto('product_images')
      .values(urls.map((url, position) => ({ product_id: row.id, url, position })))
      .execute();
  }
  if (product.model) {
    const glb = await buildVaseGlb(product.model);
    const fileUrl = await storage.put(`${randomUUID()}.glb`, glb, MODEL_MIME_TYPE);
    await db
      .insertInto('product_models')
      .values({
        product_id: row.id,
        file_url: fileUrl,
        file_size: glb.length,
        poster_url: urls[0] ?? null,
      })
      .execute();
  }
}

const MATERIALS = [
  {
    name: 'Paxta ip (10 g oʻrama)',
    description: 'Kashta va toʻqish uchun, 40 xil rang.',
    price: 6_000,
    discountPercent: 15,
    stock: 400,
  },
  {
    name: 'Atlas mato (1 metr)',
    description: 'Milliy libos uchun, kengligi 140 sm.',
    price: 45_000,
    discountPercent: 10,
    stock: 120,
  },
  {
    name: 'Yuqori navli un (5 kg)',
    description: 'Pishiriq va non uchun.',
    price: 38_000,
    discountPercent: 12,
    stock: 200,
  },
  {
    name: 'Tikuv ignalari toʻplami',
    description: 'Turli oʻlchamdagi 30 ta igna.',
    price: 9_000,
    discountPercent: 0,
    stock: 300,
  },
] as const;

async function seedMaterials(db: Db): Promise<void> {
  const existing = await db.selectFrom('materials').select('id').limit(1).executeTakeFirst();
  if (existing) return;
  await db
    .insertInto('materials')
    .values(
      MATERIALS.map((m) => ({
        name: m.name,
        description: m.description,
        price: m.price,
        discount_percent: m.discountPercent,
        stock: m.stock,
      })),
    )
    .execute();
}

/** Adds sample marketplace content once; returns how many workers were created. */
export async function seedSampleData(db: Db): Promise<number> {
  const storage = new DbStorageProvider(db);
  const categories = await categoryIds(db);
  let created = 0;
  for (const seed of WORKERS) {
    const exists = await db
      .selectFrom('users')
      .select('id')
      .where('phone', '=', seed.phone)
      .executeTakeFirst();
    if (exists) continue;
    await seedWorker(db, storage, seed, categories);
    created += 1;
  }
  await syncSamplePhotos(db);
  await seedMaterials(db);
  return created;
}
