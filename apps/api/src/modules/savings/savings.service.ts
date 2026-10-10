import type { SavingsGoalDto } from '@barakali/shared';
import type { AppContext } from '../../context.js';

export class SavingsService {
  constructor(
    private readonly ctx: AppContext,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async get(workerId: string): Promise<SavingsGoalDto | null> {
    const goal = await this.ctx.db
      .selectFrom('savings_goals')
      .select(['target_amount', 'created_at'])
      .where('worker_id', '=', workerId)
      .executeTakeFirst();
    if (!goal) return null;
    return this.toDto(workerId, goal.target_amount, goal.created_at);
  }

  /** Changing the target keeps the start date, so progress is not wiped by an edit. */
  async set(workerId: string, targetAmount: number): Promise<SavingsGoalDto> {
    const row = await this.ctx.db
      .insertInto('savings_goals')
      .values({ worker_id: workerId, target_amount: targetAmount, updated_at: this.now() })
      .onConflict((oc) =>
        oc.column('worker_id').doUpdateSet({ target_amount: targetAmount, updated_at: this.now() }),
      )
      .returning(['target_amount', 'created_at'])
      .executeTakeFirstOrThrow();
    return this.toDto(workerId, row.target_amount, row.created_at);
  }

  async clear(workerId: string): Promise<void> {
    await this.ctx.db.deleteFrom('savings_goals').where('worker_id', '=', workerId).execute();
  }

  private async toDto(
    workerId: string,
    targetAmount: number,
    createdAt: Date,
  ): Promise<SavingsGoalDto> {
    const row = await this.ctx.db
      .selectFrom('earnings')
      .select((eb) => eb.fn.coalesce(eb.fn.sum<number>('amount'), eb.lit(0)).as('total'))
      .where('worker_id', '=', workerId)
      .where('created_at', '>=', createdAt)
      .executeTakeFirstOrThrow();
    return { targetAmount, saved: Number(row.total), createdAt: createdAt.toISOString() };
  }
}
