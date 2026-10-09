-- Up Migration
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_uz text NOT NULL,
  name_ru text NOT NULL,
  position integer NOT NULL DEFAULT 0
);

INSERT INTO categories (slug, name_uz, name_ru, position) VALUES
  ('tikuvchilik', 'Tikuvchilik', 'Шитьё', 1),
  ('pishiriq', 'Pishiriq', 'Выпечка', 2),
  ('qol-mehnati', 'Qo''l mehnati', 'Рукоделие', 3),
  ('dizayn', 'Dizayn', 'Дизайн', 4),
  ('masofaviy-ishlar', 'Masofaviy ishlar', 'Удалённая работа', 5);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  name text,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'worker', 'admin')),
  language text NOT NULL DEFAULT 'uz' CHECK (language IN ('uz', 'ru')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories (id),
  display_name text NOT NULL,
  bio text,
  avatar_url text,
  rating numeric(3, 2) NOT NULL DEFAULT 0,
  reviews_count integer NOT NULL DEFAULT 0,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX workers_category_idx ON workers (category_id);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES workers (id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories (id),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  retail_price bigint NOT NULL CHECK (retail_price > 0),
  wholesale_price bigint CHECK (wholesale_price IS NULL OR wholesale_price > 0),
  wholesale_min_qty integer CHECK (wholesale_min_qty IS NULL OR wholesale_min_qty >= 2),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'hidden')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_wholesale_pair CHECK (
    (wholesale_price IS NULL) = (wholesale_min_qty IS NULL)
  ),
  CONSTRAINT products_wholesale_lower CHECK (
    wholesale_price IS NULL OR wholesale_price < retail_price
  )
);
CREATE INDEX products_worker_status_idx ON products (worker_id, status);
CREATE INDEX products_category_status_idx ON products (category_id, status);
-- Uzbek apostrophe variants (' ʻ ʼ ’ ‘ `) collapse to one form for search.
CREATE FUNCTION uz_normalize(value text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$ SELECT lower(translate(value, '''ʻʼ’‘`', '')) $$;
CREATE INDEX products_title_trgm_idx ON products USING gin (uz_normalize(title) gin_trgm_ops);

CREATE TABLE product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  url text NOT NULL,
  position integer NOT NULL DEFAULT 0
);
CREATE INDEX product_images_product_idx ON product_images (product_id, position);

CREATE TABLE product_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL UNIQUE REFERENCES products (id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_size integer NOT NULL,
  poster_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('service', 'product')),
  customer_id uuid NOT NULL REFERENCES users (id),
  worker_id uuid NOT NULL REFERENCES workers (id),
  status text NOT NULL DEFAULT 'awaiting_payment' CHECK (
    status IN ('awaiting_payment', 'new', 'accepted', 'in_progress', 'ready', 'delivered', 'cancelled', 'refunded')
  ),
  total bigint NOT NULL CHECK (total >= 0),
  commission bigint NOT NULL CHECK (commission >= 0),
  worker_amount bigint NOT NULL CHECK (worker_amount >= 0),
  fulfillment text NOT NULL DEFAULT 'pickup' CHECK (fulfillment IN ('pickup', 'delivery')),
  delivery_address text,
  start_time timestamptz,
  end_time timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_type_idx ON orders (type);
CREATE INDEX orders_customer_idx ON orders (customer_id, created_at DESC);
CREATE INDEX orders_worker_status_idx ON orders (worker_id, status);

CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id uuid REFERENCES products (id) ON DELETE SET NULL,
  title_snapshot text NOT NULL,
  unit_price bigint NOT NULL CHECK (unit_price > 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  price_type text NOT NULL CHECK (price_type IN ('retail', 'wholesale'))
);
CREATE INDEX order_items_order_idx ON order_items (order_id);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  amount bigint NOT NULL CHECK (amount >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'refunded', 'failed')),
  provider text NOT NULL,
  provider_ref text,
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payments_order_idx ON payments (order_id);

CREATE TABLE earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES orders (id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES workers (id),
  amount bigint NOT NULL CHECK (amount >= 0),
  commission bigint NOT NULL CHECK (commission >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX earnings_worker_idx ON earnings (worker_id, created_at DESC);

CREATE TABLE sms_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sms_codes_phone_idx ON sms_codes (phone, created_at DESC);

CREATE TABLE refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX refresh_tokens_user_idx ON refresh_tokens (user_id);

CREATE TABLE files (
  name text PRIMARY KEY,
  content_type text NOT NULL,
  size integer NOT NULL,
  data bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Down Migration
DROP FUNCTION IF EXISTS uz_normalize(text) CASCADE;
DROP TABLE IF EXISTS files, refresh_tokens, sms_codes, earnings, payments, order_items, orders,
  product_models, product_images, products, workers, users, categories CASCADE;
