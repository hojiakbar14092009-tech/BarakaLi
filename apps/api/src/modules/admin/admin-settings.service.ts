import { sql } from 'kysely';
import {
  COMMISSION_RATE_PERCENT,
  type AdminCategoryDto,
  type CategoryUpdate,
  type PlatformSettingsDto,
  type PublicSettingsDto,
  type SettingsUpdate,
} from '@barakali/shared';
import type { AppContext } from '../../context.js';
import { AppError } from '../../errors.js';
import { cached } from '../../infra/cache.js';
import { writeAudit } from './audit.js';

const SETTINGS_CACHE_KEY = 'settings';
const CATEGORIES_CACHE_KEY = 'categories';
const FEATURED_CACHE_KEY = 'workers:featured';
const SETTINGS_TTL_SECONDS = 60;

/** Categories (names, on/off) and the single row of platform settings. */
export class AdminSettingsService {
  constructor(
    private readonly ctx: AppContext,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async listCategories(): Promise<AdminCategoryDto[]> {
    const rows = await this.ctx.db
      .selectFrom('categories as c')
      .select([
        'c.id',
        'c.slug',
        'c.name_uz',
        'c.name_ru',
        'c.is_active',
        sql<number>`(select count(*) from products p where p.category_id = c.id and p.deleted_at is null)`.as(
          'products_count',
        ),
      ])
      .orderBy('c.position')
      .execute();
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      nameUz: row.name_uz,
      nameRu: row.name_ru,
      isActive: row.is_active,
      productsCount: Number(row.products_count),
    }));
  }

  /** Switching a category off keeps its products; only new products and workers are refused. */
  async updateCategory(adminId: string, id: string, input: CategoryUpdate): Promise<void> {
    await this.ctx.db.transaction().execute(async (trx) => {
      const result = await trx
        .updateTable('categories')
        .set({ name_uz: input.nameUz, name_ru: input.nameRu, is_active: input.isActive })
        .where('id', '=', id)
        .executeTakeFirst();
      if (Number(result.numUpdatedRows) !== 1) throw AppError.notFound();
      await writeAudit(trx, {
        adminId,
        action: 'category.update',
        targetType: 'category',
        targetId: id,
        details: { nameUz: input.nameUz, nameRu: input.nameRu, isActive: input.isActive },
      });
    });
    this.ctx.cache.delete(CATEGORIES_CACHE_KEY);
    this.ctx.cache.delete(FEATURED_CACHE_KEY);
  }

  private async row() {
    return this.ctx.db
      .selectFrom('platform_settings')
      .selectAll()
      .where('id', '=', 1)
      .executeTakeFirstOrThrow();
  }

  async get(): Promise<PlatformSettingsDto> {
    const row = await this.row();
    return {
      acceptApplications: row.accept_applications,
      announcement:
        row.announcement_uz || row.announcement_ru
          ? { uz: row.announcement_uz ?? '', ru: row.announcement_ru ?? '' }
          : null,
      commissionPercent: COMMISSION_RATE_PERCENT,
      updatedAt: row.updated_at.toISOString(),
    };
  }

  /** What the public site needs: whether applications are open and the home page notice. */
  publicSettings(): Promise<PublicSettingsDto> {
    return cached(this.ctx.cache, SETTINGS_CACHE_KEY, SETTINGS_TTL_SECONDS, async () => {
      const { acceptApplications, announcement } = await this.get();
      return { acceptApplications, announcement };
    });
  }

  async update(adminId: string, input: SettingsUpdate): Promise<PlatformSettingsDto> {
    await this.ctx.db.transaction().execute(async (trx) => {
      await trx
        .updateTable('platform_settings')
        .set({
          accept_applications: input.acceptApplications,
          announcement_uz: input.announcementUz || null,
          announcement_ru: input.announcementRu || null,
          updated_at: this.now(),
          updated_by: adminId,
        })
        .where('id', '=', 1)
        .execute();
      await writeAudit(trx, {
        adminId,
        action: 'settings.update',
        targetType: 'settings',
        targetId: null,
        details: {
          acceptApplications: input.acceptApplications,
          announcementUz: input.announcementUz || null,
          announcementRu: input.announcementRu || null,
        },
      });
    });
    this.ctx.cache.delete(SETTINGS_CACHE_KEY);
    return this.get();
  }
}
