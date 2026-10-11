import type { AdminMaterialOrderDto, MaterialShipInput } from '@barakali/shared';
import type { AppContext } from '../../context.js';
import { AppError } from '../../errors.js';
import { notifyWorkerOfShipment } from '../notifications/material-notifications.js';
import { sendNewOrderSms } from '../notifications/notification.service.js';
import { toMaterialOrderDtos } from './material.mapper.js';

const ADMIN_LIST_LIMIT = 50;
// Kept short and free of phone numbers: the console SMS provider may log message text.
const SHIPPED_SMS = 'BarakaLi: materiallar yo‘lga chiqdi / материалы в пути';

/**
 * The administrator's side of materials delivery: paid orders wait to go out, are sent with a
 * courier (the worker is told who is coming), then marked delivered. Only these steps exist:
 * paid -> shipped -> delivered.
 */
export class MaterialDeliveryService {
  constructor(
    private readonly ctx: AppContext,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Paid orders first (they need action), then the rest, newest first. */
  async list(): Promise<AdminMaterialOrderDto[]> {
    const rows = await this.ctx.db
      .selectFrom('material_orders as m')
      .innerJoin('workers as w', 'w.id', 'm.worker_id')
      .innerJoin('users as u', 'u.id', 'w.user_id')
      .selectAll('m')
      .select(['w.display_name as worker_name', 'u.phone as worker_phone'])
      .where('m.status', '!=', 'awaiting_payment')
      .orderBy((eb) => eb.case().when('m.status', '=', 'paid').then(0).else(1).end())
      .orderBy('m.created_at', 'desc')
      .limit(ADMIN_LIST_LIMIT)
      .execute();
    const dtos = await toMaterialOrderDtos(this.ctx.db, rows);
    const workers = new Map(rows.map((row) => [row.id, row]));
    return dtos.map((dto) => ({
      ...dto,
      workerName: workers.get(dto.id)?.worker_name ?? '',
      workerPhone: workers.get(dto.id)?.worker_phone ?? '',
    }));
  }

  /** Status, courier and the worker's notice change together; the SMS copy follows the commit. */
  async ship(orderId: string, input: MaterialShipInput): Promise<void> {
    const phone = await this.ctx.db.transaction().execute(async (trx) => {
      const result = await trx
        .updateTable('material_orders')
        .set({
          status: 'shipped',
          courier_name: input.courierName,
          courier_phone: input.courierPhone,
          shipped_at: this.now(),
          updated_at: this.now(),
        })
        .where('id', '=', orderId)
        .where('status', '=', 'paid')
        .executeTakeFirst();
      if (Number(result.numUpdatedRows) !== 1) {
        throw AppError.conflict('MATERIAL_ORDER_INVALID_TRANSITION');
      }
      return notifyWorkerOfShipment(trx, orderId, input.courierName);
    });
    await sendNewOrderSms(this.ctx, phone, SHIPPED_SMS);
  }

  async markDelivered(orderId: string): Promise<void> {
    const result = await this.ctx.db
      .updateTable('material_orders')
      .set({ status: 'delivered', delivered_at: this.now(), updated_at: this.now() })
      .where('id', '=', orderId)
      .where('status', '=', 'shipped')
      .executeTakeFirst();
    if (Number(result.numUpdatedRows) !== 1) {
      throw AppError.conflict('MATERIAL_ORDER_INVALID_TRANSITION');
    }
  }
}
