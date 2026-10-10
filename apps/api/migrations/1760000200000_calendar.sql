-- Up Migration
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE workers
  ADD COLUMN hourly_rate bigint CHECK (hourly_rate IS NULL OR hourly_rate > 0);

-- Free windows a worker publishes. The exclusion constraint keeps one worker's windows from overlapping.
CREATE TABLE availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES workers (id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT availability_range_valid CHECK (end_time > start_time),
  CONSTRAINT availability_no_overlap
    EXCLUDE USING gist (worker_id WITH =, tstzrange(start_time, end_time) WITH &&)
);
CREATE INDEX availability_worker_idx ON availability (worker_id, start_time);

ALTER TABLE orders
  ADD COLUMN description text,
  ADD COLUMN deadline date,
  ADD CONSTRAINT orders_service_has_slot CHECK (
    type = 'product' OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
  ),
  -- Slot clash is decided by the database, not by a check-then-insert in application code.
  -- A slot is held from the moment the order is created (even unpaid) until it leaves these states.
  ADD CONSTRAINT orders_slot_no_overlap
    EXCLUDE USING gist (worker_id WITH =, tstzrange(start_time, end_time) WITH &&)
    WHERE (start_time IS NOT NULL AND status IN ('awaiting_payment', 'new', 'accepted', 'in_progress'));
CREATE INDEX orders_status_created_idx ON orders (status, created_at);

CREATE TABLE order_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  url text NOT NULL,
  position integer NOT NULL DEFAULT 0
);
CREATE INDEX order_images_order_idx ON order_images (order_id, position);

-- Down Migration
DROP TABLE IF EXISTS order_images, availability CASCADE;
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_slot_no_overlap,
  DROP CONSTRAINT IF EXISTS orders_service_has_slot,
  DROP COLUMN IF EXISTS deadline,
  DROP COLUMN IF EXISTS description;
ALTER TABLE workers DROP COLUMN IF EXISTS hourly_rate;
