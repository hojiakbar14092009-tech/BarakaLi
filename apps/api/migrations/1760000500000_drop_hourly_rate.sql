-- Up Migration
-- Service orders no longer carry a price: a worker's calendar only publishes free time.
ALTER TABLE workers DROP COLUMN IF EXISTS hourly_rate;

-- Down Migration
ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS hourly_rate bigint CHECK (hourly_rate IS NULL OR hourly_rate > 0);
