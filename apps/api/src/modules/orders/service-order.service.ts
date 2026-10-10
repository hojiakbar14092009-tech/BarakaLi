import {
  rangeContains,
  splitOrderAmount,
  type CreateServiceOrderInput,
  type OrderDto,
} from '@barakali/shared';
import type { AppContext } from '../../context.js';
import { isExclusionViolation } from '../../db/errors.js';
import { AppError } from '../../errors.js';
import { FILES_URL_PREFIX } from '../../infra/storage.js';
import { expireUnpaidOrders } from '../jobs/order-expiry.js';
import { OrderRepository } from './order.repository.js';

const HOUR_MS = 60 * 60 * 1000;
const IMAGE_CONTENT_TYPE = 'image/webp';

export class ServiceOrderService {
  private readonly repo: OrderRepository;

  constructor(
    private readonly ctx: AppContext,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.repo = new OrderRepository(ctx.db);
  }

  /**
   * Books a slot and stores the request with its photos in one transaction. A service order carries
   * no money: it goes straight to `new` for the worker to accept, and the two sides agree the work
   * and its price by phone once the order is accepted. A clash with another booking is rejected by
   * the database constraint itself, so two simultaneous customers cannot both get the slot.
   */
  async create(customerId: string, input: CreateServiceOrderInput): Promise<OrderDto> {
    const now = this.now();
    const start = new Date(input.startTime);
    const end = new Date(start.getTime() + input.hours * HOUR_MS);
    if (start <= now) throw AppError.badRequest('SLOT_IN_PAST');

    await expireUnpaidOrders(this.ctx.db, now);
    const worker = await this.ctx.db
      .selectFrom('workers')
      .select(['id', 'user_id'])
      .where('id', '=', input.workerId)
      .executeTakeFirst();
    if (!worker) throw AppError.notFound();
    if (worker.user_id === customerId) throw AppError.badRequest('OWN_SERVICE');
    await this.assertInsideAvailability(worker.id, start, end);
    await this.assertImagesStored(input.imageUrls);

    const split = splitOrderAmount(0);
    try {
      const orderId = await this.ctx.db.transaction().execute(async (trx) => {
        const order = await trx
          .insertInto('orders')
          .values({
            type: 'service',
            customer_id: customerId,
            worker_id: worker.id,
            status: 'new',
            total: split.total,
            commission_amount: split.commission,
            commission_rate: split.commissionRate,
            worker_amount: split.workerAmount,
            fulfillment: 'pickup',
            delivery_address: null,
            start_time: start,
            end_time: end,
            description: input.description,
            deadline: input.deadline,
            updated_at: now,
          })
          .returning('id')
          .executeTakeFirstOrThrow();
        if (input.imageUrls.length > 0) {
          await trx
            .insertInto('order_images')
            .values(input.imageUrls.map((url, position) => ({ order_id: order.id, url, position })))
            .execute();
        }
        return order.id;
      });
      const [dto] = await this.repo.findDtos([orderId], {
        userId: customerId,
        workerId: undefined,
      });
      if (!dto) throw AppError.notFound();
      return dto;
    } catch (error) {
      if (isExclusionViolation(error)) throw AppError.conflict('ORDER_SLOT_TAKEN');
      throw error;
    }
  }

  private async assertInsideAvailability(workerId: string, start: Date, end: Date): Promise<void> {
    const windows = await this.ctx.db
      .selectFrom('availability')
      .select(['start_time', 'end_time'])
      .where('worker_id', '=', workerId)
      .where('start_time', '<=', start)
      .where('end_time', '>=', end)
      .execute();
    const fits = windows.some((window) =>
      rangeContains(
        { start: new Date(window.start_time), end: new Date(window.end_time) },
        { start, end },
      ),
    );
    if (!fits) throw AppError.conflict('SLOT_OUTSIDE_AVAILABILITY');
  }

  /** Only photos this platform stored can be attached; arbitrary URLs are never saved. */
  private async assertImagesStored(urls: string[]): Promise<void> {
    if (urls.length === 0) return;
    const names = urls.map((url) =>
      url.startsWith(FILES_URL_PREFIX) ? url.slice(FILES_URL_PREFIX.length) : '',
    );
    if (names.some((name) => name === '' || name.includes('/'))) {
      throw AppError.badRequest('ORDER_IMAGE_INVALID');
    }
    const rows = await this.ctx.db
      .selectFrom('files')
      .select('name')
      .where('name', 'in', names)
      .where('content_type', '=', IMAGE_CONTENT_TYPE)
      .execute();
    if (new Set(rows.map((row) => row.name)).size !== new Set(names).size) {
      throw AppError.badRequest('ORDER_IMAGE_INVALID');
    }
  }
}
