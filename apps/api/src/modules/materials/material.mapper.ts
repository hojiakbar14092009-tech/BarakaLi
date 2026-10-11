import type { Kysely, Selectable } from 'kysely';
import { discountedPrice, type MaterialDto, type MaterialOrderDto } from '@barakali/shared';
import type { Database, MaterialOrdersTable, MaterialsTable } from '../../db/schema.js';

export type MaterialOrderRow = Selectable<MaterialOrdersTable>;

export function toMaterialDto(row: Selectable<MaterialsTable>): MaterialDto {
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

function courierOf(row: MaterialOrderRow): MaterialOrderDto['courier'] {
  return row.courier_name && row.courier_phone
    ? { name: row.courier_name, phone: row.courier_phone }
    : null;
}

/** Orders with their items, loaded with one IN query for any number of orders (no N+1). */
export async function toMaterialOrderDtos(
  db: Kysely<Database>,
  rows: MaterialOrderRow[],
): Promise<MaterialOrderDto[]> {
  if (rows.length === 0) return [];
  const items = await db
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
    deliveryAddress: row.delivery_address,
    courier: courierOf(row),
    shippedAt: row.shipped_at ? row.shipped_at.toISOString() : null,
    deliveredAt: row.delivered_at ? row.delivered_at.toISOString() : null,
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
