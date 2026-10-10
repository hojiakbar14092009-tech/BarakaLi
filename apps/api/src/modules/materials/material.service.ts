import type { Selectable, Transaction } from 'kysely';
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
import type { Database, MaterialOrdersTable, MaterialsTable } from '../../db/schema.js';
import { AppError } from '../../errors.js';

type MaterialRow = Selectable<MaterialsTable>;
type MaterialOrderRow = Selectable<MaterialOrdersTable>;

export function toMaterialDto(row: MaterialRow): MaterialDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    discountPercent: row.discount_percent,
    unitPrice: discountedPrice(row.price, row.discount_percent),
    stock: row.stock,
    isActive: row.is_active,
  };
}

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
    const lines = [...merged].map(([materialId, quantity]) => {
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
    const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    const orderId = await this.ctx.db.transaction().execute(async (trx) => {
      const order = await trx
        .insertInto('material_orders')
        .values({ worker_id: workerId, total, updated_at: this.now() })
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

  async startPayment(workerId: string, orderId: string): Promise<PaymentSessionDto> {
    const order = await this.findOwnedRow(workerId, orderId);
    const existing = await this.ctx.db
      .selectFrom('material_payments')
      .selectAll()
      .where('material_order_id', '=', orderId)
      .executeTakeFirst();
    if (existing?.status === 'paid') throw AppError.conflict('PAYMENT_ALREADY_PAID');
    if (order.status !== 'awaiting_payment') throw AppError.conflict('MATERIAL_ORDER_NOT_PAYABLE');
    let payment = existing;
    if (!payment) {
      const created = await this.ctx.payments.createPayment({ orderId, amount: order.total });
      await this.ctx.db
        .insertInto('material_payments')
        .values({
          material_order_id: orderId,
          amount: order.total,
          provider: this.ctx.payments.name,
          provider_ref: created.providerRef,
          idempotency_key: `material:${orderId}`,
        })
        .onConflict((oc) => oc.column('idempotency_key').doNothing())
        .execute();
      payment = await this.ctx.db
        .selectFrom('material_payments')
        .selectAll()
        .where('material_order_id', '=', orderId)
        .executeTakeFirstOrThrow();
    }
    return {
      paymentId: payment.id,
      orderId,
      amount: payment.amount,
      status: payment.status,
      redirectUrl: `/materiallar/tolov/${orderId}`,
    };
  }

  /** Idempotent: a repeated confirmation of a paid order returns it without touching stock again. */
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
    return this.withItems(rows);
  }

  async getOwned(workerId: string, orderId: string): Promise<MaterialOrderDto> {
    const row = await this.findOwnedRow(workerId, orderId);
    const [dto] = await this.withItems([row]);
    if (!dto) throw AppError.notFound();
    return dto;
  }

  async adminList(): Promise<(MaterialOrderDto & { workerName: string })[]> {
    const rows = await this.ctx.db
      .selectFrom('material_orders as m')
      .innerJoin('workers as w', 'w.id', 'm.worker_id')
      .selectAll('m')
      .select('w.display_name as worker_name')
      .where('m.status', '!=', 'awaiting_payment')
      .orderBy('m.created_at', 'desc')
      .limit(50)
      .execute();
    const dtos = await this.withItems(rows);
    const names = new Map(rows.map((row) => [row.id, row.worker_name]));
    return dtos.map((dto) => ({ ...dto, workerName: names.get(dto.id) ?? '' }));
  }

  async markDelivered(orderId: string): Promise<void> {
    const result = await this.ctx.db
      .updateTable('material_orders')
      .set({ status: 'delivered', updated_at: this.now() })
      .where('id', '=', orderId)
      .where('status', '=', 'paid')
      .executeTakeFirst();
    if (Number(result.numUpdatedRows) !== 1) throw AppError.conflict('ORDER_INVALID_TRANSITION');
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

  /** One IN query for the items of any number of orders (no N+1). */
  private async withItems(rows: MaterialOrderRow[]): Promise<MaterialOrderDto[]> {
    if (rows.length === 0) return [];
    const items = await this.ctx.db
      .selectFrom('material_order_items')
      .selectAll()
      .where(
        'material_order_id',
        'in',
        rows.map((row) => row.id),
      )
      .execute();
    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      total: row.total,
      createdAt: row.created_at.toISOString(),
      items: items
        .filter((item) => item.material_order_id === row.id)
        .map((item) => ({
          id: item.id,
          materialId: item.material_id,
          name: item.name_snapshot,
          unitPrice: item.unit_price,
          quantity: item.quantity,
        })),
    }));
  }
}
