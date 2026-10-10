-- Up Migration

-- The catering section was removed. The table is dropped only when it holds no rows; if enquiries
-- exist they are left untouched for the team to export first (nothing in the app reads them).
DO $$
BEGIN
  IF to_regclass('public.catering_requests') IS NOT NULL THEN
    IF (SELECT count(*) FROM catering_requests) = 0 THEN
      DROP TABLE catering_requests;
    ELSE
      RAISE NOTICE 'catering_requests has rows; table kept';
    END IF;
  END IF;
END
$$;

-- Down Migration
-- Not reversible: the table is only dropped when empty, and its definition lives in migration
-- 1760001000000_catering_requests.sql.
SELECT 1;
