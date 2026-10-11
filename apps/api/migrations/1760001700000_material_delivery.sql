-- Up Migration

-- Materials are delivered by the platform: once paid, an administrator sends the order out with a
-- courier ('shipped'), then marks it delivered. The worker gives the address when ordering; the
-- courier reaches the worker on the account phone, and the worker sees who is bringing the order.
ALTER TABLE material_orders DROP CONSTRAINT IF EXISTS material_orders_status_check;
ALTER TABLE material_orders
  ADD CONSTRAINT material_orders_status_check
    CHECK (status IN ('awaiting_payment', 'paid', 'shipped', 'delivered', 'cancelled'));

-- Nullable: orders placed before delivery existed have no address.
ALTER TABLE material_orders ADD COLUMN delivery_address text;
ALTER TABLE material_orders ADD COLUMN courier_name text;
ALTER TABLE material_orders ADD COLUMN courier_phone text;
ALTER TABLE material_orders ADD COLUMN shipped_at timestamptz;
ALTER TABLE material_orders ADD COLUMN delivered_at timestamptz;
ALTER TABLE material_orders
  ADD CONSTRAINT material_orders_shipped_has_courier
    CHECK (status NOT IN ('shipped') OR (courier_name IS NOT NULL AND courier_phone IS NOT NULL));

ALTER TABLE notifications
  ADD COLUMN material_order_id uuid REFERENCES material_orders (id) ON DELETE CASCADE;
CREATE INDEX notifications_material_order_idx ON notifications (material_order_id)
  WHERE material_order_id IS NOT NULL;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_kind_check;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_kind_check CHECK (
    kind IN (
      'order_new',
      'worker_application_received',
      'worker_approved',
      'worker_rejected',
      'worker_suspended',
      'material_order_paid',
      'material_order_shipped'
    )
  );

-- Down Migration
DELETE FROM notifications WHERE kind IN ('material_order_paid', 'material_order_shipped');
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_kind_check;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_kind_check CHECK (
    kind IN (
      'order_new',
      'worker_application_received',
      'worker_approved',
      'worker_rejected',
      'worker_suspended'
    )
  );
DROP INDEX IF EXISTS notifications_material_order_idx;
ALTER TABLE notifications DROP COLUMN IF EXISTS material_order_id;
UPDATE material_orders SET status = 'paid' WHERE status = 'shipped';
ALTER TABLE material_orders DROP CONSTRAINT IF EXISTS material_orders_shipped_has_courier;
ALTER TABLE material_orders
  DROP COLUMN IF EXISTS delivery_address,
  DROP COLUMN IF EXISTS courier_name,
  DROP COLUMN IF EXISTS courier_phone,
  DROP COLUMN IF EXISTS shipped_at,
  DROP COLUMN IF EXISTS delivered_at;
ALTER TABLE material_orders DROP CONSTRAINT IF EXISTS material_orders_status_check;
ALTER TABLE material_orders
  ADD CONSTRAINT material_orders_status_check
    CHECK (status IN ('awaiting_payment', 'paid', 'delivered', 'cancelled'));
