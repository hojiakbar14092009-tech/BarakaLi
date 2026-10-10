-- Up Migration
CREATE TABLE materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price bigint NOT NULL CHECK (price > 0),
  discount_percent smallint NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 90),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE material_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES workers (id),
  status text NOT NULL DEFAULT 'awaiting_payment'
    CHECK (status IN ('awaiting_payment', 'paid', 'delivered', 'cancelled')),
  total bigint NOT NULL CHECK (total > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX material_orders_worker_idx ON material_orders (worker_id, created_at DESC);
CREATE INDEX material_orders_status_idx ON material_orders (status, created_at);

CREATE TABLE material_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_order_id uuid NOT NULL REFERENCES material_orders (id) ON DELETE CASCADE,
  material_id uuid REFERENCES materials (id) ON DELETE SET NULL,
  name_snapshot text NOT NULL,
  unit_price bigint NOT NULL CHECK (unit_price > 0),
  quantity integer NOT NULL CHECK (quantity > 0)
);
CREATE INDEX material_order_items_order_idx ON material_order_items (material_order_id);

-- Same shape as `payments`, kept apart so product/service payment code stays untouched.
CREATE TABLE material_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_order_id uuid NOT NULL REFERENCES material_orders (id) ON DELETE CASCADE,
  amount bigint NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'refunded', 'failed')),
  provider text NOT NULL,
  provider_ref text,
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX material_payments_order_idx ON material_payments (material_order_id);

CREATE TABLE savings_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL UNIQUE REFERENCES workers (id) ON DELETE CASCADE,
  target_amount bigint NOT NULL CHECK (target_amount > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reviews_status_idx ON reviews (status, created_at DESC);
CREATE INDEX complaints_status_idx ON complaints (status, created_at DESC);
CREATE INDEX workers_verified_idx ON workers (is_verified, created_at DESC);

-- Down Migration
DROP TABLE IF EXISTS savings_goals, material_payments, material_order_items, material_orders, materials CASCADE;
DROP INDEX IF EXISTS reviews_status_idx, complaints_status_idx, workers_verified_idx;
