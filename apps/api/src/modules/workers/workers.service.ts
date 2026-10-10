import type { BecomeWorkerInput, WorkerSummaryDto } from '@barakali/shared';
import type { AppContext } from '../../context.js';
import { AppError } from '../../errors.js';
import { cached } from '../../infra/cache.js';
import { AdminSettingsService } from '../admin/admin-settings.service.js';
import { WorkersRepository } from './workers.repository.js';

const FEATURED_LIMIT = 4;
const FEATURED_TTL_SECONDS = 60;
const FEATURED_CACHE_KEY = 'workers:featured';

export class WorkersService {
  private readonly repo: WorkersRepository;
  private readonly settings: AdminSettingsService;

  constructor(private readonly ctx: AppContext) {
    this.repo = new WorkersRepository(ctx.db);
    this.settings = new AdminSettingsService(ctx);
  }

  async becomeWorker(userId: string, input: BecomeWorkerInput): Promise<string> {
    if (!(await this.settings.publicSettings()).acceptApplications) {
      throw new AppError('APPLICATIONS_CLOSED', 403);
    }
    if (await this.repo.findIdByUser(userId)) throw AppError.conflict('ALREADY_WORKER');
    if (!(await this.repo.categoryExists(input.categoryId))) {
      throw AppError.validation({ categoryId: ['NOT_FOUND'] });
    }
    const id = await this.repo.create(userId, input);
    this.ctx.cache.delete(FEATURED_CACHE_KEY);
    return id;
  }

  featured(): Promise<WorkerSummaryDto[]> {
    return cached(this.ctx.cache, FEATURED_CACHE_KEY, FEATURED_TTL_SECONDS, () =>
      this.repo.findFeatured(FEATURED_LIMIT),
    );
  }

  async getById(id: string): Promise<WorkerSummaryDto> {
    const worker = await this.repo.findById(id);
    if (!worker) throw AppError.notFound();
    return worker;
  }

  async setTelegramUsername(userId: string, telegramUsername: string | null): Promise<void> {
    if (!(await this.repo.setTelegramUsername(userId, telegramUsername))) {
      throw new AppError('WORKER_REQUIRED', 403);
    }
  }
}
