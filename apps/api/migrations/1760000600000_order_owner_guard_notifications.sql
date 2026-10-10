-- Up Migration

-- Hard guarantee that a product line can only sit on an order addressed to the product's owner.
-- Checked on every insert/update of order_items; existing rows are not touched or validated here.
CREATE FUNCTION order_item_owner_matches() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
DECLARE
  product_owner uuid;
  order_worker uuid;
BEGIN
  IF NEW.product_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT worker_id INTO product_owner FROM products WHERE id = NEW.product_id;
  SELECT worker_id INTO order_worker FROM orders WHERE id = NEW.order_id;
  IF product_owner IS DISTINCT FROM order_worker THEN
    RAISE EXCEPTION 'order_items.product owner % does not match orders.worker_id %',
      product_owner, order_worker
      USING ERRCODE = 'check_violation', CONSTRAINT = 'order_items_owner_matches';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER order_items_owner_matches
  BEFORE INSERT OR UPDATE OF product_id, order_id ON order_items
  FOR EACH ROW EXECUTE FUNCTION order_item_owner_matches();

-- In-app notifications; the SMS gateway is a separate, not yet connected, channel.
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('order_new')),
  order_id uuid REFERENCES orders (id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_unread_idx ON notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;
CREATE INDEX notifications_user_idx ON notifications (user_id, created_at DESC);

-- Down Migration
DROP TABLE IF EXISTS notifications;
DROP TRIGGER IF EXISTS order_items_owner_matches ON order_items;
DROP FUNCTION IF EXISTS order_item_owner_matches();
