-- Up Migration
CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- One review per order: the unique key is what stops a second review at the database level.
  order_id uuid NOT NULL UNIQUE REFERENCES orders (id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES users (id),
  worker_id uuid NOT NULL REFERENCES workers (id),
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text CHECK (comment IS NULL OR char_length(comment) <= 1000),
  status text NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reviews_worker_idx ON reviews (worker_id, created_at DESC);

CREATE TABLE complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users (id),
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 5 AND 1000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX complaints_order_idx ON complaints (order_id);
-- A user can have only one open complaint per order; they can file again after it is closed.
CREATE UNIQUE INDEX complaints_one_open_per_user_idx
  ON complaints (order_id, user_id) WHERE status = 'open';

-- Down Migration
DROP TABLE IF EXISTS complaints, reviews CASCADE;
