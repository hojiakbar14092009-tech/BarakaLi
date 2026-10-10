import {
  ALL_CATEGORIES_SLUG,
  type CategoryDto,
  type ListQuery,
  type Page,
  type ProductDto,
} from '@barakali/shared';
import type { AppContext } from '../../context.js';
import { AppError } from '../../errors.js';
import { cached } from '../../infra/cache.js';
import { ProductRepository } from '../products/product.repository.js';

const CATEGORIES_TTL_SECONDS = 600;

export class CatalogService {
  private readonly products: ProductRepository;

  constructor(private readonly ctx: AppContext) {
    this.products = new ProductRepository(ctx.db);
  }

  categories(): Promise<CategoryDto[]> {
    return cached(this.ctx.cache, 'categories', CATEGORIES_TTL_SECONDS, async () => {
      const rows = await this.ctx.db
        .selectFrom('categories')
        .select(['id', 'slug', 'name_uz', 'name_ru'])
        .where('is_active', '=', true)
        .orderBy('position')
        .execute();
      return rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: { uz: row.name_uz, ru: row.name_ru },
      }));
    });
  }

  async listProducts(query: ListQuery): Promise<Page<ProductDto>> {
    const { ids, total } = await this.products.list(
      {
        q: query.q,
        categorySlug:
          query.category && query.category !== ALL_CATEGORIES_SLUG ? query.category : undefined,
        workerId: query.workerId,
        publishedOnly: true,
        sort: query.sort,
      },
      query.page,
      query.pageSize,
    );
    const items = await this.products.findDtosByIds(ids);
    return { items, page: query.page, pageSize: query.pageSize, total };
  }

  /** Drafts, hidden products and products of unapproved workers are visible only to their owner. */
  async getProduct(id: string, viewerWorkerId: string | undefined): Promise<ProductDto> {
    const [product] = await this.products.findDtosByIds([id]);
    if (!product) throw AppError.notFound('PRODUCT_NOT_FOUND');
    if (product.worker.id === viewerWorkerId) return product;
    const visible =
      product.status === 'published' && (await this.products.isWorkerApproved(product.worker.id));
    if (!visible) throw AppError.notFound('PRODUCT_NOT_FOUND');
    return product;
  }
}
