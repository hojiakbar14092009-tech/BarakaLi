-- Up Migration

-- Somsa is a meal, not baking: products named like it leave the Pishiriq catalog. They are hidden,
-- never deleted, so order history keeps pointing at them.
UPDATE products p
SET status = 'hidden', updated_at = now()
FROM categories c
WHERE c.id = p.category_id
  AND c.slug = 'pishiriq'
  AND p.status <> 'hidden'
  AND (uz_normalize(p.title) LIKE '%samsa%' OR uz_normalize(p.title) LIKE '%somsa%');

-- Down Migration
SELECT 1;
