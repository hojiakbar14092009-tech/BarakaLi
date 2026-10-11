-- Up Migration

-- The sample workers (seed accounts +998900000001..4) were never reviewed by an administrator, so
-- they are not recommended. Their published works are handed to the workers an administrator has
-- approved, shared out round-robin, preferring a worker of the product's own category. Only the
-- owner changes: product rows, photos (product_images) and 3D models (product_models) stay as they
-- are, nothing is deleted. Past orders keep their original worker. Every move is recorded so the
-- down migration can put each product back. With no reviewed worker yet, nothing moves.
CREATE TABLE sample_product_reassignments (
  product_id uuid PRIMARY KEY REFERENCES products (id) ON DELETE CASCADE,
  from_worker_id uuid NOT NULL REFERENCES workers (id),
  to_worker_id uuid NOT NULL REFERENCES workers (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

WITH sample_workers AS (
  SELECT w.id
  FROM workers w
  JOIN users u ON u.id = w.user_id
  WHERE u.phone IN ('+998900000001', '+998900000002', '+998900000003', '+998900000004')
),
targets AS (
  SELECT
    w.id,
    w.category_id,
    row_number() OVER (ORDER BY w.reviewed_at, w.id) - 1 AS n,
    count(*) OVER () AS total,
    row_number() OVER (PARTITION BY w.category_id ORDER BY w.reviewed_at, w.id) - 1 AS cat_n,
    count(*) OVER (PARTITION BY w.category_id) AS cat_total
  FROM workers w
  JOIN users u ON u.id = w.user_id
  WHERE w.status = 'approved'
    AND w.reviewed_at IS NOT NULL
    AND u.blocked_at IS NULL
    AND w.id NOT IN (SELECT id FROM sample_workers)
),
moving AS (
  SELECT
    p.id,
    p.worker_id,
    p.category_id,
    row_number() OVER (ORDER BY p.created_at, p.id) - 1 AS n,
    row_number() OVER (PARTITION BY p.category_id ORDER BY p.created_at, p.id) - 1 AS cat_n
  FROM products p
  WHERE p.worker_id IN (SELECT id FROM sample_workers)
    AND p.status = 'published'
    AND p.deleted_at IS NULL
),
plan AS (
  SELECT
    m.id AS product_id,
    m.worker_id AS from_worker_id,
    COALESCE(
      (SELECT t.id FROM targets t
        WHERE t.category_id = m.category_id AND t.cat_n = m.cat_n % t.cat_total),
      (SELECT t.id FROM targets t WHERE t.n = m.n % t.total)
    ) AS to_worker_id
  FROM moving m
)
INSERT INTO sample_product_reassignments (product_id, from_worker_id, to_worker_id)
SELECT product_id, from_worker_id, to_worker_id FROM plan WHERE to_worker_id IS NOT NULL;

UPDATE products p
SET worker_id = r.to_worker_id, updated_at = now()
FROM sample_product_reassignments r
WHERE p.id = r.product_id;

-- Down Migration
UPDATE products p
SET worker_id = r.from_worker_id, updated_at = now()
FROM sample_product_reassignments r
WHERE p.id = r.product_id;
DROP TABLE IF EXISTS sample_product_reassignments;
