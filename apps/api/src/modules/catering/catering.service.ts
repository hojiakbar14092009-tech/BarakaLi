import type { CateringRequestInput } from '@barakali/shared';
import type { AppContext } from '../../context.js';
import type { Db } from '../../db/client.js';

export class CateringService {
  private readonly db: Db;

  constructor(ctx: AppContext) {
    this.db = ctx.db;
  }

  /** Stores an enquiry for the team to call back; nothing is ordered or paid at this point. */
  async createRequest(input: CateringRequestInput): Promise<{ id: string }> {
    return this.db
      .insertInto('catering_requests')
      .values({
        name: input.name,
        phone: input.phone,
        service_type_id: input.serviceTypeId,
        event_date: input.eventDate,
        guests_count: input.guestsCount,
        note: input.note,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
  }
}
