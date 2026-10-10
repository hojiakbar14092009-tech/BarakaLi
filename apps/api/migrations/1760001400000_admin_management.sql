-- Up Migration

-- Products are never hard-deleted by an administrator: a deleted product keeps its rows (order
-- history refers to them) and simply stops existing for every query.
ALTER TABLE products ADD COLUMN deleted_at timestamptz;
CREATE INDEX products_live_idx ON products (worker_id, status) WHERE deleted_at IS NULL;

-- A blocked user cannot sign in and their sessions are refused.
ALTER TABLE users
  ADD COLUMN blocked_at timestamptz,
  ADD COLUMN block_reason text;

-- Money going back: one row per refund, written in the same transaction as the payment and order
-- status change. commission_reversed is non-zero only when earnings had already been recorded.
CREATE TABLE refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders (id),
  payment_id uuid NOT NULL REFERENCES payments (id),
  amount integer NOT NULL CHECK (amount > 0),
  commission_reversed integer NOT NULL DEFAULT 0 CHECK (commission_reversed >= 0),
  reason text,
  admin_user_id uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX refunds_order_idx ON refunds (order_id);

-- Down Migration
DROP TABLE IF EXISTS refunds;
ALTER TABLE users DROP COLUMN IF EXISTS blocked_at, DROP COLUMN IF EXISTS block_reason;
DROP INDEX IF EXISTS products_live_idx;
ALTER TABLE products DROP COLUMN IF EXISTS deleted_at;
