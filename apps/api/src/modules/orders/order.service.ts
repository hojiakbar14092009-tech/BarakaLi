import {
  canTransition,
  resolveLinePrice,
  splitOrderAmount,
  type CartItemInput,
  type CreateOrdersInput,
  type EarningsDto,
  type OrderAction,
  type OrderDto,
  type OrderStatus,
} from '@barakali/shared';
import type { Transaction } from 'kysely';
import type { AppContext } from '../../context.js';
import type { Database } from '../../db/schema.js';
import { AppError } from '../../errors.js';
import { refundPaidOrder } from '../payments/payment.service.js';
import { OrderRepository, type OrderViewer } from './order.repository.js';

const ACTION_TARGET: Record<OrderAction, OrderStatus> = {
  accept: 'accepted',
  reject: 'refunded',
  start: 'in_progress',
  ready: 'ready',
  deliver: 'delivered',
};

const EARNINGS_HISTORY_LIMIT = 20;
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

interface PricedLine {
  productId: string;
  workerId: string;
  title: string;
  unitPrice: number;
  priceType: 'retail' | 'wholesale';
  quantity: number;
  lineTotal: number;
}

/** Start of the current calendar month in Asia/Tashkent (UTC+5), as a UTC instant. */
export function startOfTashkentMonth(now: Date): Date {
  const local = new Date(now.getTime() + TASHKENT_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - TASHKENT_OFFSET_MS);
}

function mergeDuplicates(items: CartItemInput[]): CartItemInput[] {
  const merged = new Map<string, number>();
  for (const item of items)
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);
  return [...merged].map(([productId, quantity]) => ({ productId, quantity }));
}

export class OrderService {
  private readonly repo: OrderRepository;

  constructor(
    private readonly ctx: AppContext,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.repo = new OrderRepository(ctx.db);
  }

  async createOrders(customerId: string, input: CreateOrdersInput): Promise<OrderDto[]> {
    const lines = await this.priceItems(customerId, mergeDuplicates(input.items));
    const byWorker = new Map<string, PricedLine[]>();
    for (const line of lines)
      byWorker.set(line.workerId, [...(byWorker.get(line.workerId) ?? []), line]);
    const ids = await this.ctx.db.transaction().execute(async (trx) => {
      const created: string[] = [];
      for (const [workerId, workerLines] of byWorker) {
        created.push(await this.insertOrder(trx, customerId, workerId, workerLines, input));
      }
      return created;
    });
    return this.repo.findDtos(ids, { userId: customerId, workerId: undefined });
  }

  async list(viewer: OrderViewer, as: 'customer' | 'worker'): Promise<OrderDto[]> {
    if (as === 'worker') {
      if (!viewer.workerId) throw new AppError('WORKER_REQUIRED', 403);
      return this.repo.findDtos(await this.repo.listIdsForWorker(viewer.workerId), viewer);
    }
    return this.repo.findDtos(await this.repo.listIdsForCustomer(viewer.userId), viewer);
  }

  async get(viewer: OrderViewer, id: string): Promise<OrderDto> {
    const refs = await this.repo.findOwnerRefs(id);
    const isParty =
      refs && (refs.customerId === viewer.userId || refs.workerId === viewer.workerId);
    if (!refs || !isParty) throw AppError.notFound();
    const [dto] = await this.repo.findDtos([id], viewer);
    if (!dto) throw AppError.notFound();
    return dto;
  }

  async act(viewer: OrderViewer, id: string, action: OrderAction): Promise<OrderDto> {
    if (!viewer.workerId) throw new AppError('WORKER_REQUIRED', 403);
    await this.ctx.db.transaction().execute(async (trx) => {
      const order = await trx
        .selectFrom('orders')
        .selectAll()
        .where('id', '=', id)
        .forUpdate()
        .executeTakeFirst();
      if (!order) throw AppError.notFound();
      if (order.worker_id !== viewer.workerId) throw AppError.forbidden();
      const target = ACTION_TARGET[action];
      // Refund from a started order exists only as the admin's complaint refund, never as a worker action.
      const rejectsStarted = action === 'reject' && order.status !== 'new';
      if (rejectsStarted || !canTransition(order.status as OrderStatus, target))
        throw AppError.conflict('ORDER_INVALID_TRANSITION');
      if (action === 'reject') await refundPaidOrder(trx, this.ctx.payments, id);
      if (action === 'deliver') {
        await trx
          .insertInto('earnings')
          .values({
            order_id: id,
            worker_id: order.worker_id,
            amount: order.worker_amount,
            commission: order.commission,
          })
          .execute();
      }
      await trx
        .updateTable('orders')
        .set({ status: target, updated_at: this.now() })
        .where('id', '=', id)
        .execute();
    });
    return this.get(viewer, id);
  }

  async earnings(workerId: string): Promise<EarningsDto> {
    const [monthTotal, allTimeTotal, history] = await Promise.all([
      this.repo.earningsSince(workerId, startOfTashkentMonth(this.now())),
      this.repo.earningsTotal(workerId),
      this.repo.earningsFor(workerId, EARNINGS_HISTORY_LIMIT),
    ]);
    return {
      monthTotal,
      allTimeTotal,
      history: history.map((row) => ({
        orderId: row.order_id,
        amount: row.amount,
        commission: row.commission,
        createdAt: row.created_at.toISOString(),
      })),
    };
  }

  private async priceItems(customerId: string, items: CartItemInput[]): Promise<PricedLine[]> {
    const rows = await this.ctx.db
      .selectFrom('products as p')
      .innerJoin('workers as w', 'w.id', 'p.worker_id')
      .select([
        'p.id',
        'p.worker_id',
        'p.title',
        'p.status',
        'p.stock',
        'p.retail_price',
        'p.wholesale_price',
        'p.wholesale_min_qty',
        'w.user_id as owner_user_id',
      ])
      .where(
        'p.id',
        'in',
        items.map((item) => item.productId),
      )
      .execute();
    const byId = new Map(rows.map((row) => [row.id, row]));
    return items.map((item) => {
      const product = byId.get(item.productId);
      if (!product || product.status !== 'published')
        throw AppError.notFound('PRODUCT_UNAVAILABLE');
      if (product.owner_user_id === customerId) throw AppError.badRequest('OWN_PRODUCT');
      if (product.stock < item.quantity) throw AppError.conflict('INSUFFICIENT_STOCK');
      const price = resolveLinePrice(
        {
          retailPrice: product.retail_price,
          wholesalePrice: product.wholesale_price,
          wholesaleMinQty: product.wholesale_min_qty,
        },
        item.quantity,
      );
      return {
        productId: product.id,
        workerId: product.worker_id,
        title: product.title,
        unitPrice: price.unitPrice,
        priceType: price.priceType,
        quantity: item.quantity,
        lineTotal: price.lineTotal,
      };
    });
  }

  private async insertOrder(
    trx: Transaction<Database>,
    customerId: string,
    workerId: string,
    lines: PricedLine[],
    input: CreateOrdersInput,
  ): Promise<string> {
    const split = splitOrderAmount(lines.reduce((sum, line) => sum + line.lineTotal, 0));
    const order = await trx
      .insertInto('orders')
      .values({
        type: 'product',
        customer_id: customerId,
        worker_id: workerId,
        total: split.total,
        commission: split.commission,
        worker_amount: split.workerAmount,
        fulfillment: input.fulfillment,
        delivery_address: input.fulfillment === 'delivery' ? (input.deliveryAddress ?? null) : null,
        start_time: null,
        end_time: null,
        updated_at: this.now(),
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    await trx
      .insertInto('order_items')
      .values(
        lines.map((line) => ({
          order_id: order.id,
          product_id: line.productId,
          title_snapshot: line.title,
          unit_price: line.unitPrice,
          quantity: line.quantity,
          price_type: line.priceType,
        })),
      )
      .execute();
    return order.id;
  }
}
