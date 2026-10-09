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
  tint: string;
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
        description:
          'Qoʻlda tanlangan adras matosidan tikilgan koʻylak. Oʻlcham buyurtmaga qarab oʻzgartiriladi.',
        retailPrice: 420_000,
        stock: 6,
        tint: '#b08968',
      },
      {
        title: 'Kashta ilingan sumka',
        description: 'Suzani naqshli, astarli kundalik sumka. Ichida cho‘ntagi bor.',
        retailPrice: 95_000,
        wholesalePrice: 80_000,
        wholesaleMinQty: 10,
        stock: 40,
        tint: '#9c6644',
      },
      {
        title: 'Bolalar uchun paxtali kombinezon',
        description: 'Yumshoq paxta, 1–3 yosh uchun. Tugmalari xavfsiz mahkamlangan.',
        retailPrice: 130_000,
        wholesalePrice: 110_000,
        wholesaleMinQty: 5,
        stock: 25,
        tint: '#ddb892',
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
        description: 'Asalli qatlamli klassik tort, qaymoqli krem bilan. Bayramlar uchun.',
        retailPrice: 180_000,
        stock: 8,
        tint: '#e6b17e',
      },
      {
        title: 'Tandirda pishgan samsa',
        description: 'Goʻshtli, piyozli samsa. Ulgurji narx kafe va tadbirlar uchun.',
        retailPrice: 9_000,
        wholesalePrice: 7_500,
        wholesaleMinQty: 20,
        stock: 200,
        tint: '#d4a373',
      },
      {
        title: 'Yong‘oqli pakhlava',
        description: 'Yupqa qatlamli, yong‘oq va asalli pakhlava. 500 g quti.',
        retailPrice: 85_000,
        wholesalePrice: 72_000,
        wholesaleMinQty: 6,
        stock: 30,
        tint: '#c08552',
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
        description: 'Oʻrta hajmli sopol vaza. 3D koʻrinishda aylantirib koʻring.',
        retailPrice: 150_000,
        wholesalePrice: 125_000,
        wholesaleMinQty: 4,
        stock: 12,
        tint: '#b9835a',
        model: [0.72, 0.5, 0.36],
      },
      {
        title: 'Suzani yostiq jildi',
        description: 'Qoʻlda kashta qilingan, 45×45 sm yostiq jildi.',
        retailPrice: 110_000,
        stock: 15,
        tint: '#a98467',
      },
      {
        title: 'Toʻqilgan savat',
        description: 'Tabiiy tolalardan toʻqilgan, uy-roʻzgʻor uchun mustahkam savat.',
        retailPrice: 70_000,
        wholesalePrice: 58_000,
        wholesaleMinQty: 8,
        stock: 22,
        tint: '#cb997e',
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
        tint: '#8d6e63',
      },
    ],
  },
];

const IMAGE_SIZE = 900;

async function renderImage(tint: string, variant: number): Promise<Buffer> {
  const { default: sharp } = await import('sharp');
  const shift = variant * 70;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${IMAGE_SIZE}" height="${IMAGE_SIZE}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fcf8f0"/><stop offset="1" stop-color="${tint}"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="${300 + shift}" cy="${330 + shift / 2}" r="${190 - variant * 20}" fill="${tint}" fill-opacity="0.55"/>
    <circle cx="${620 - shift}" cy="${560}" r="${230}" fill="#392e26" fill-opacity="0.12"/>
  </svg>`;
  return sharp(Buffer.from(svg)).webp({ quality: 78 }).toBuffer();
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
      is_verified: seed.verified,
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
  const urls: string[] = [];
  for (const variant of [0, 1]) {
    const image = await renderImage(product.tint, variant);
    urls.push(await storage.put(`${randomUUID()}.webp`, image, 'image/webp'));
  }
  await db
    .insertInto('product_images')
    .values(urls.map((url, position) => ({ product_id: row.id, url, position })))
    .execute();
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
  return created;
}
