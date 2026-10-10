-- Up Migration

-- "Masofaviy ishlar" is no longer offered. The row stays so existing workers, products and order
-- history keep their category_id; an inactive category is left out of the catalog and cannot be
-- chosen for new workers or products.
ALTER TABLE categories ADD COLUMN is_active boolean NOT NULL DEFAULT true;

UPDATE categories SET is_active = false WHERE slug = 'masofaviy-ishlar';

-- Down Migration
ALTER TABLE categories DROP COLUMN IF EXISTS is_active;
