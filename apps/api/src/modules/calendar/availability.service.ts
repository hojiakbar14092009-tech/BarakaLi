import {
  AVAILABILITY_HORIZON_DAYS,
  MAX_AVAILABILITY_HOURS,
  SLOT_HOLDING_STATUSES,
  type AvailabilityDto,
  type AvailabilityInput,
  type AvailabilityWindowDto,
} from '@barakali/shared';
import type { AppContext } from '../../context.js';
import { isExclusionViolation } from '../../db/errors.js';
import { AppError } from '../../errors.js';
import { expireUnpaidOrders } from '../jobs/order-expiry.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export class AvailabilityService {
  constructor(
    private readonly ctx: AppContext,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Free windows still ahead of now and the slots already taken inside them. */
  async read(workerId: string): Promise<AvailabilityDto> {
    const now = this.now();
    // Unpaid holds older than the payment window must not hide a slot that is effectively free.
    await expireUnpaidOrders(this.ctx.db, now);
    const horizon = new Date(now.getTime() + AVAILABILITY_HORIZON_DAYS * DAY_MS);
    const [windows, booked] = await Promise.all([
      this.ctx.db
        .selectFrom('availability')
        .select(['id', 'start_time', 'end_time'])
        .where('worker_id', '=', workerId)
        .where('end_time', '>', now)
        .where('start_time', '<', horizon)
        .orderBy('start_time')
        .execute(),
      this.ctx.db
        .selectFrom('orders')
        .select(['start_time', 'end_time'])
        .where('worker_id', '=', workerId)
        .where('start_time', 'is not', null)
        .where('end_time', '>', now)
        .where('status', 'in', [...SLOT_HOLDING_STATUSES])
        .orderBy('start_time')
        .execute(),
    ]);
    return {
      windows: windows.map((row) => ({
        id: row.id,
        startTime: new Date(row.start_time).toISOString(),
        endTime: new Date(row.end_time).toISOString(),
      })),
      booked: booked.flatMap((row) =>
        row.start_time && row.end_time
          ? [{ startTime: row.start_time.toISOString(), endTime: row.end_time.toISOString() }]
          : [],
      ),
    };
  }

  async workerExists(workerId: string): Promise<boolean> {
    const row = await this.ctx.db
      .selectFrom('workers')
      .select('id')
      .where('id', '=', workerId)
      .executeTakeFirst();
    return row !== undefined;
  }

  async add(workerId: string, input: AvailabilityInput): Promise<AvailabilityWindowDto> {
    const start = new Date(input.startTime);
    const end = new Date(input.endTime);
    const now = this.now();
    const length = end.getTime() - start.getTime();
    const horizon = now.getTime() + AVAILABILITY_HORIZON_DAYS * DAY_MS;
    if (length <= 0 || length > MAX_AVAILABILITY_HOURS * HOUR_MS || start <= now) {
      throw AppError.badRequest('AVAILABILITY_INVALID');
    }
    if (start.getTime() > horizon) throw AppError.badRequest('AVAILABILITY_INVALID');
    try {
      const row = await this.ctx.db
        .insertInto('availability')
        .values({ worker_id: workerId, start_time: start, end_time: end })
        .returning(['id', 'start_time', 'end_time'])
        .executeTakeFirstOrThrow();
      return {
        id: row.id,
        startTime: new Date(row.start_time).toISOString(),
        endTime: new Date(row.end_time).toISOString(),
      };
    } catch (error) {
      if (isExclusionViolation(error)) throw AppError.conflict('AVAILABILITY_OVERLAP');
      throw error;
    }
  }

  async remove(workerId: string, id: string): Promise<void> {
    const result = await this.ctx.db
      .deleteFrom('availability')
      .where('id', '=', id)
      .where('worker_id', '=', workerId)
      .executeTakeFirst();
    if (Number(result.numDeletedRows) !== 1) throw AppError.notFound();
  }
}
