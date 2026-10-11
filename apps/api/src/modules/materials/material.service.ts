import type { Transaction } from 'kysely';
import {
  discountedPrice,
  type CardPaymentInput,
  type MaterialDto,
  type MaterialInput,
  type MaterialOrderDto,
  type MaterialOrderInput,
  type PaymentSessionDto,
} from '@barakali/shared';
import type { AppContext } from '../../context.js';
import type { Database } from '../../db/schema.js';
import { AppError } from '../../errors.js';
import { notifyAdminsOfMaterialOrder } from '../notifications/material-notifications.js';
import { toMaterialDto, toMaterialOrderDtos, type MaterialOrderRow } from './material.mapper.js';

export { toMaterialDto } from './material.mapper.js';

/** Returns reserved stock only while an order is paid; guards against overselling like products. */
async function reserveMaterialStock(trx: Transaction<Database>, orderId: string): Promise<void> {
  const items = await trx
    .selectFrom('material_order_items')
    .select(['material_id', 'quantity'])
    .where('material_order_id', '=', orderId)
    .execute();
  for (const item of items) {
    if (!item.material_id) throw AppError.conflict('MATERIAL_UNAVAILABLE');
    const result = await trx
      .updateTable('materials')
      .set((eb) => ({ stock: eb('stock', '-', item.quantity) }))
      .where('id', '=', item.material_id)
      .where('is_active', '=', true)
      .where('stock', '>=', item.quantity)
      .executeTakeFirst();
    if (Number(result.numUpdatedRows) !== 1) throw AppError.conflict('INSUFFICIENT_STOCK');
  }
}

/** The materials store for workers: catalog, ordering with a delivery address, and payment. */
export class MaterialService {
  constructor(
    private readonly ctx: AppContext,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async listActive(): Promise<MaterialDto[]> {
    const rows = await this.ctx.db
      .selectFrom('materials')
      .selectAll()
      .where('is_active', '=', true)
      .orderBy('name')
      .execute();
    return rows.map(toMaterialDto);
  }

  async listAll(): Promise<MaterialDto[]> {
    const rows = await this.ctx.db.selectFrom('materials').selectAll().orderBy('name').execute();
    return rows.map(toMaterialDto);
  }

  async create(input: MaterialInput): Promise<MaterialDto> {
    const row = await this.ctx.db
      .insertInto('materials')
      .values({
        name: input.name,
        description: input.description,
        price: input.price,
        discount_percent: input.discountPercent,
        stock: input.stock,
        is_active: input.isActive,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return toMaterialDto(row);
  }

  async update(id: string, input: MaterialInput): Promise<MaterialDto> {
    const row = await this.ctx.db
      .updateTable('materials')
      .set({
        name: input.name,
        description: input.description,
        price: input.price,
        discount_percent: input.discountPercent,
        stock: input.stock,
        is_active: input.isActive,
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst();
    if (!row) throw AppError.notFound();
    return toMaterialDto(row);
  }

  /** Prices come from the catalog on the server; the client only names materials and amounts. */
  async createOrder(workerId: string, input: MaterialOrderInput): Promise<MaterialOrderDto> {
    const lines = await this.priceLines(input);
    const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    const orderId = await this.ctx.db.transaction().execute(async (trx) => {
      const order = await trx
        .insertInto('material_orders')
        .values({
          worker_id: workerId,
          total,
          delivery_address: input.deliveryAddress,
          updated_at: this.now(),
        })
        .returning('id')
        .executeTakeFirstOrThrow();
      await trx
        .insertInto('material_order_items')
        .values(
          lines.map((line) => ({
            material_order_id: order.id,
            material_id: line.materialId,
            name_snapshot: line.name,
            unit_price: line.unitPrice,
            quantity: line.quantity,
          })),
        )
        .execute();
      return order.id;
    });
    return this.getOwned(workerId, orderId);
  }

  private async priceLines(input: MaterialOrderInput) {
    const merged = new Map<string, number>();
    for (const item of input.items) {
      merged.set(item.materialId, (merged.get(item.materialId) ?? 0) + item.quantity);
    }
    const rows = await this.ctx.db
      .selectFrom('materials')
      .selectAll()
      .where('id', 'in', [...merged.keys()])
      .execute();
    const byId = new Map(rows.map((row) => [row.id, row]));
    return [...merged].map(([materialId, quantity]) => {
      const material = byId.get(materialId);
      if (!material || !material.is_active) throw AppError.notFound('MATERIAL_UNAVAILABLE');
      if (material.stock < quantity) throw AppError.conflict('INSUFFICIENT_STOCK');
      return {
        materialId,
        name: material.name,
        unitPrice: discountedPrice(material.price, material.discount_percent),
        quantity,
      };
    });
  }

  async startPayment(workerId: string, orderId: string): Promise<PaymentSessionDto> {
    const order = await this.findOwnedRow(workerId, orderId);
    const existing = await this.ctx.db
      .selectFrom('material_payments')
      .selectAll()
      .where('material_order_id', '=', orderId)
      .executeTakeFirst();
    if (existing?.status === 'paid') throw AppError.conflict('PAYMENT_ALREADY_PAID');
    if (order.status !== 'awaiting_payment') throw AppError.conflict('MATERIAL_ORDER_NOT_PAYABLE');
    const payment = existing ?? (await this.openPayment(orderId, order.total));
    return {
      paymentId: payment.id,
      orderId,
      amount: payment.amount,
      status: payment.status,
      redirectUrl: `/materiallar/tolov/${orderId}`,
    };
  }

  private async openPayment(orderId: string, amount: number) {
    const created = await this.ctx.payments.createPayment({ orderId, amount });
    await this.ctx.db
      .insertInto('material_payments')
      .values({
        material_order_id: orderId,
        amount,
        provider: this.ctx.payments.name,
        provider_ref: created.providerRef,
        idempotency_key: `material:${orderId}`,
      })
      .onConflict((oc) => oc.column('idempotency_key').doNothing())
      .execute();
    return this.ctx.db
      .selectFrom('material_payments')
      .selectAll()
      .where('material_order_id', '=', orderId)
      .executeTakeFirstOrThrow();
  }

  /**
   * Idempotent: a repeated confirmation of a paid order returns it without touching stock again.
   * Stock, payment, status and the administrators' notice change in one transaction.
   */
  async confirmPayment(
    workerId: string,
    orderId: string,
    card: CardPaymentInput,
  ): Promise<MaterialOrderDto> {
    const outcome = await this.ctx.db.transaction().execute(async (trx) => {
      const order = await trx
        .selectFrom('material_orders')
        .selectAll()
        .where('id', '=', orderId)
        .forUpdate()
        .executeTakeFirst();
      if (!order || order.worker_id !== workerId) throw AppError.notFound();
      const payment = await trx
        .selectFrom('material_payments')
        .selectAll()
        .where('material_order_id', '=', orderId)
        .forUpdate()
        .executeTakeFirst();
      if (!payment) throw AppError.conflict('MATERIAL_ORDER_NOT_PAYABLE');
      if (payment.status === 'paid') return 'paid' as const;
      if (order.status !== 'awaiting_payment') {
        throw AppError.conflict('MATERIAL_ORDER_NOT_PAYABLE');
      }
      const result = await this.ctx.payments.verifyCallback(card, {
        orderId,
        amount: order.total,
      });
      if (result.status === 'failed') return 'declined' as const;
      await reserveMaterialStock(trx, orderId);
      await trx
        .updateTable('material_payments')
        .set({ status: 'paid', provider_ref: result.providerRef })
        .where('id', '=', payment.id)
        .execute();
      await trx
        .updateTable('material_orders')
        .set({ status: 'paid', updated_at: this.now() })
        .where('id', '=', orderId)
        .execute();
      await notifyAdminsOfMaterialOrder(trx, orderId);
      return 'paid' as const;
    });
    if (outcome === 'declined') throw new AppError('PAYMENT_DECLINED', 402);
    return this.getOwned(workerId, orderId);
  }

  async listForWorker(workerId: string): Promise<MaterialOrderDto[]> {
    const rows = await this.ctx.db
      .selectFrom('material_orders')
      .selectAll()
      .where('worker_id', '=', workerId)
      .orderBy('created_at', 'desc')
      .limit(30)
      .execute();
    return toMaterialOrderDtos(this.ctx.db, rows);
  }

  async getOwned(workerId: string, orderId: string): Promise<MaterialOrderDto> {
    const row = await this.findOwnedRow(workerId, orderId);
    const [dto] = await toMaterialOrderDtos(this.ctx.db, [row]);
    if (!dto) throw AppError.notFound();
    return dto;
  }

  private async findOwnedRow(workerId: string, orderId: string): Promise<MaterialOrderRow> {
    const row = await this.ctx.db
      .selectFrom('material_orders')
      .selectAll()
      .where('id', '=', orderId)
      .executeTakeFirst();
    if (!row || row.worker_id !== workerId) throw AppError.notFound();
    return row;
  }
}
