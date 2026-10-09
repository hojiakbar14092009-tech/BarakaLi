import { sql, type Selectable } from 'kysely';
import type {
  ProductDto,
  ProductImageDto,
  ProductInput,
  ProductModelDto,
  ProductStatus,
} from '@barakali/shared';
import type { Db } from '../../db/client.js';
import type { ProductImagesTable } from '../../db/schema.js';

export interface ProductFilter {
  q?: string;
  categorySlug?: string;
  workerId?: string;
  publishedOnly: boolean;
  sort: 'new' | 'price_asc' | 'price_desc';
}

export interface ProductOwnership {
  id: string;
  workerId: string;
  status: ProductStatus;
}

const UZ_APOSTROPHES = /['ʻʼ’‘`]/g;

/** Mirrors the SQL function uz_normalize so search matches regardless of apostrophe style. */
export function normalizeSearch(value: string): string {
  return value.replace(UZ_APOSTROPHES, '').toLowerCase();
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

type ImageRow = Selectable<ProductImagesTable>;

export class ProductRepository {
  constructor(private readonly db: Db) {}

  async list(
    filter: ProductFilter,
    page: number,
    pageSize: number,
  ): Promise<{ ids: string[]; total: number }> {
    const totalRow = await this.filtered(filter)
      .select(sql<number>`count(*)`.as('total'))
      .executeTakeFirstOrThrow();
    let ordered = this.filtered(filter).select('p.id');
    if (filter.sort === 'price_asc') ordered = ordered.orderBy('p.retail_price', 'asc');
    else if (filter.sort === 'price_desc') ordered = ordered.orderBy('p.retail_price', 'desc');
    else ordered = ordered.orderBy('p.created_at', 'desc');
    const rows = await ordered
      .orderBy('p.id')
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .execute();
    return { ids: rows.map((row) => row.id), total: Number(totalRow.total) };
  }

  /** Three queries regardless of how many products: rows, images (IN), models (IN). */
  async findDtosByIds(ids: string[]): Promise<ProductDto[]> {
    if (ids.length === 0) return [];
    const [rows, images, models] = await Promise.all([
      this.db
        .selectFrom('products as p')
        .innerJoin('workers as w', 'w.id', 'p.worker_id')
        .innerJoin('categories as c', 'c.id', 'p.category_id')
        .select([
          'p.id',
          'p.worker_id',
          'w.display_name',
          'w.is_verified',
          'p.category_id',
          'c.slug as category_slug',
          'p.title',
          'p.description',
          'p.retail_price',
          'p.wholesale_price',
          'p.wholesale_min_qty',
          'p.stock',
          'p.status',
          'p.created_at',
        ])
        .where('p.id', 'in', ids)
        .execute(),
      this.db
        .selectFrom('product_images')
        .selectAll()
        .where('product_id', 'in', ids)
        .orderBy('position')
        .execute(),
      this.db.selectFrom('product_models').selectAll().where('product_id', 'in', ids).execute(),
    ]);
    const imagesByProduct = groupImages(images);
    const modelByProduct = new Map(models.map((model) => [model.product_id, model]));
    const byId = new Map(
      rows.map((row) => {
        const productImages = imagesByProduct.get(row.id) ?? [];
        const stored = modelByProduct.get(row.id);
        const model: ProductModelDto | null = stored
          ? {
              fileUrl: stored.file_url,
              fileSize: stored.file_size,
              posterUrl: productImages[0]?.url ?? stored.poster_url,
            }
          : null;
        const dto: ProductDto = {
          id: row.id,
          worker: { id: row.worker_id, displayName: row.display_name, isVerified: row.is_verified },
          categoryId: row.category_id,
          categorySlug: row.category_slug,
          title: row.title,
          description: row.description,
          retailPrice: row.retail_price,
          wholesalePrice: row.wholesale_price,
          wholesaleMinQty: row.wholesale_min_qty,
          stock: row.stock,
          status: row.status,
          images: productImages,
          model,
          createdAt: row.created_at.toISOString(),
        };
        return [row.id, dto] as const;
      }),
    );
    return ids.flatMap((id) => {
      const dto = byId.get(id);
      return dto ? [dto] : [];
    });
  }

  async listIdsByWorker(workerId: string): Promise<string[]> {
    const rows = await this.db
      .selectFrom('products')
      .select('id')
      .where('worker_id', '=', workerId)
      .orderBy('created_at', 'desc')
      .execute();
    return rows.map((row) => row.id);
  }

  async findOwnership(id: string): Promise<ProductOwnership | undefined> {
    const row = await this.db
      .selectFrom('products')
      .select(['id', 'worker_id', 'status'])
      .where('id', '=', id)
      .executeTakeFirst();
    return row ? { id: row.id, workerId: row.worker_id, status: row.status } : undefined;
  }

  async categoryExists(categoryId: string): Promise<boolean> {
    const row = await this.db
      .selectFrom('categories')
      .select('id')
      .where('id', '=', categoryId)
      .executeTakeFirst();
    return row !== undefined;
  }

  async create(workerId: string, input: ProductInput): Promise<string> {
    const row = await this.db
      .insertInto('products')
      .values({
        worker_id: workerId,
        category_id: input.categoryId,
        title: input.title,
        description: input.description,
        retail_price: input.retailPrice,
        wholesale_price: input.wholesalePrice,
        wholesale_min_qty: input.wholesaleMinQty,
        stock: input.stock,
        status: input.status,
        updated_at: new Date(),
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    return row.id;
  }

  async update(id: string, input: ProductInput): Promise<void> {
    await this.db
      .updateTable('products')
      .set({
        category_id: input.categoryId,
        title: input.title,
        description: input.description,
        retail_price: input.retailPrice,
        wholesale_price: input.wholesalePrice,
        wholesale_min_qty: input.wholesaleMinQty,
        stock: input.stock,
        status: input.status,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .execute();
  }

  async setStock(id: string, stock: number): Promise<void> {
    await this.db
      .updateTable('products')
      .set({ stock, updated_at: new Date() })
      .where('id', '=', id)
      .execute();
  }

  async setStatus(id: string, status: ProductStatus): Promise<void> {
    await this.db
      .updateTable('products')
      .set({ status, updated_at: new Date() })
      .where('id', '=', id)
      .execute();
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteFrom('products').where('id', '=', id).execute();
  }

  async listImages(productId: string): Promise<ImageRow[]> {
    return this.db
      .selectFrom('product_images')
      .selectAll()
      .where('product_id', '=', productId)
      .orderBy('position')
      .execute();
  }

  async addImage(productId: string, url: string, position: number): Promise<void> {
    await this.db
      .insertInto('product_images')
      .values({ product_id: productId, url, position })
      .execute();
  }

  async removeImage(productId: string, imageId: string): Promise<string | undefined> {
    const row = await this.db
      .deleteFrom('product_images')
      .where('id', '=', imageId)
      .where('product_id', '=', productId)
      .returning('url')
      .executeTakeFirst();
    return row?.url;
  }

  async getModelUrl(productId: string): Promise<string | undefined> {
    const row = await this.db
      .selectFrom('product_models')
      .select('file_url')
      .where('product_id', '=', productId)
      .executeTakeFirst();
    return row?.file_url;
  }

  async upsertModel(
    productId: string,
    fileUrl: string,
    fileSize: number,
    posterUrl: string | null,
  ): Promise<void> {
    await this.db
      .insertInto('product_models')
      .values({
        product_id: productId,
        file_url: fileUrl,
        file_size: fileSize,
        poster_url: posterUrl,
      })
      .onConflict((oc) =>
        oc.column('product_id').doUpdateSet({
          file_url: fileUrl,
          file_size: fileSize,
          poster_url: posterUrl,
        }),
      )
      .execute();
  }

  async removeModel(productId: string): Promise<void> {
    await this.db.deleteFrom('product_models').where('product_id', '=', productId).execute();
  }

  private filtered(filter: ProductFilter) {
    let query = this.db
      .selectFrom('products as p')
      .innerJoin('categories as c', 'c.id', 'p.category_id');
    if (filter.publishedOnly) query = query.where('p.status', '=', 'published');
    if (filter.categorySlug) query = query.where('c.slug', '=', filter.categorySlug);
    if (filter.workerId) query = query.where('p.worker_id', '=', filter.workerId);
    if (filter.q) {
      const pattern = `%${escapeLike(normalizeSearch(filter.q))}%`;
      query = query.where(sql<boolean>`uz_normalize(p.title) like ${pattern}`);
    }
    return query;
  }
}

function groupImages(rows: ImageRow[]): Map<string, ProductImageDto[]> {
  const map = new Map<string, ProductImageDto[]>();
  for (const row of rows) {
    const list = map.get(row.product_id) ?? [];
    list.push({ id: row.id, url: row.url, position: row.position });
    map.set(row.product_id, list);
  }
  return map;
}
