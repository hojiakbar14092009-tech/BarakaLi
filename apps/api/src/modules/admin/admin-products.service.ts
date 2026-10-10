import { sql } from 'kysely';
import {
  ADMIN_PAGE_SIZE,
  PRODUCT_STATUSES,
  type AdminListQuery,
  type AdminProductDto,
  type AdminProductUpdate,
  type Page,
} from '@barakali/shared';
import type { AppContext } from '../../context.js';
import { AppError } from '../../errors.js';
import { escapeLike, normalizeSearch } from '../products/product.repository.js';
import { writeAudit } from './audit.js';

const FEATURED_CACHE_KEY = 'workers:featured';

export class AdminProductsService {
  constructor(
    private readonly ctx: AppContext,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private query() {
    return this.ctx.db
      .selectFrom('products as p')
      .innerJoin('workers as w', 'w.id', 'p.worker_id')
      .innerJoin('categories as c', 'c.id', 'p.category_id')
      .where('p.deleted_at', 'is', null)
      .select([
        'p.id',
        'p.title',
        'p.description',
        'p.worker_id',
        'w.display_name as worker_name',
        'p.category_id',
        'c.slug as category_slug',
        'p.retail_price',
        'p.wholesale_price',
        'p.wholesale_min_qty',
        'p.stock',
        'p.status',
        'p.created_at',
        sql<
          string | null
        >`(select i.url from product_images i where i.product_id = p.id order by i.position limit 1)`.as(
          'image_url',
        ),
        sql<number>`(select count(*) from order_items oi where oi.product_id = p.id)`.as(
          'orders_count',
        ),
      ]);
  }

  async list(query: AdminListQuery): Promise<Page<AdminProductDto>> {
    const offset = (query.page - 1) * ADMIN_PAGE_SIZE;
    let filtered = this.query();
    const status = PRODUCT_STATUSES.find((value) => value === query.status);
    if (status) filtered = filtered.where('p.status', '=', status);
    if (query.workerId) filtered = filtered.where('p.worker_id', '=', query.workerId);
    if (query.categoryId) filtered = filtered.where('p.category_id', '=', query.categoryId);
    if (query.q) {
      const pattern = `%${escapeLike(normalizeSearch(query.q))}%`;
      filtered = filtered.where(sql<boolean>`uz_normalize(p.title) like ${pattern}`);
    }
    const [rows, total] = await Promise.all([
      filtered.orderBy('p.created_at', 'desc').limit(ADMIN_PAGE_SIZE).offset(offset).execute(),
      filtered
        .clearSelect()
        .select((eb) => eb.fn.countAll().as('n'))
        .executeTakeFirstOrThrow(),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        workerId: row.worker_id,
        workerName: row.worker_name,
        categoryId: row.category_id,
        categorySlug: row.category_slug,
        retailPrice: row.retail_price,
        wholesalePrice: row.wholesale_price,
        wholesaleMinQty: row.wholesale_min_qty,
        stock: row.stock,
        status: row.status,
        imageUrl: row.image_url,
        ordersCount: Number(row.orders_count),
        createdAt: row.created_at.toISOString(),
      })),
      page: query.page,
      pageSize: ADMIN_PAGE_SIZE,
      total: Number(total.n),
    };
  }

  private async requireLive(id: string): Promise<{ status: string; ordersCount: number }> {
    const row = await this.ctx.db
      .selectFrom('products as p')
      .select([
        'p.status',
        sql<number>`(select count(*) from order_items oi where oi.product_id = p.id)`.as('n'),
      ])
      .where('p.id', '=', id)
      .where('p.deleted_at', 'is', null)
      .executeTakeFirst();
    if (!row) throw AppError.notFound();
    return { status: row.status, ordersCount: Number(row.n) };
  }

  async update(adminId: string, id: string, input: AdminProductUpdate): Promise<void> {
    await this.requireLive(id);
    const category = await this.ctx.db
      .selectFrom('categories')
      .select('id')
      .where('id', '=', input.categoryId)
      .where('is_active', '=', true)
      .executeTakeFirst();
    if (!category) throw AppError.validation({ categoryId: ['NOT_FOUND'] });
    await this.ctx.db.transaction().execute(async (trx) => {
      await trx
        .updateTable('products')
        .set({
          title: input.title,
          description: input.description,
          retail_price: input.retailPrice,
          category_id: input.categoryId,
          updated_at: this.now(),
        })
        .where('id', '=', id)
        .execute();
      await writeAudit(trx, {
        adminId,
        action: 'product.update',
        targetType: 'product',
        targetId: id,
        details: { title: input.title, retailPrice: input.retailPrice },
      });
    });
  }

  /** Hidden products leave the catalog; showing one again requires a photo, like publishing does. */
  async setVisible(adminId: string, id: string, visible: boolean): Promise<void> {
    await this.requireLive(id);
    if (visible) {
      const image = await this.ctx.db
        .selectFrom('product_images')
        .select('id')
        .where('product_id', '=', id)
        .executeTakeFirst();
      if (!image) throw AppError.validation({ status: ['IMAGE_REQUIRED'] });
    }
    await this.ctx.db.transaction().execute(async (trx) => {
      await trx
        .updateTable('products')
        .set({ status: visible ? 'published' : 'hidden', updated_at: this.now() })
        .where('id', '=', id)
        .execute();
      await writeAudit(trx, {
        adminId,
        action: visible ? 'product.show' : 'product.hide',
        targetType: 'product',
        targetId: id,
      });
    });
    this.ctx.cache.delete(FEATURED_CACHE_KEY);
  }

  /** Soft delete; a product that appears in any order can only be hidden. */
  async remove(adminId: string, id: string): Promise<void> {
    const { ordersCount } = await this.requireLive(id);
    if (ordersCount > 0) throw AppError.conflict('PRODUCT_HAS_ORDERS');
    await this.ctx.db.transaction().execute(async (trx) => {
      await trx
        .updateTable('products')
        .set({ status: 'hidden', deleted_at: this.now(), updated_at: this.now() })
        .where('id', '=', id)
        .execute();
      await writeAudit(trx, {
        adminId,
        action: 'product.delete',
        targetType: 'product',
        targetId: id,
      });
    });
    this.ctx.cache.delete(FEATURED_CACHE_KEY);
  }
}
