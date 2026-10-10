-- Up Migration
-- Every order keeps the rate it was charged at, so changing the platform rate never rewrites history.
-- Rows that exist before this migration were all charged at the previous rate of 5%.
ALTER TABLE orders RENAME COLUMN commission TO commission_amount;
ALTER TABLE orders
  ADD COLUMN commission_rate numeric(5, 4) NOT NULL DEFAULT 0.05
    CHECK (commission_rate >= 0 AND commission_rate < 1);
ALTER TABLE orders ALTER COLUMN commission_rate DROP DEFAULT;

-- Down Migration
ALTER TABLE orders DROP COLUMN IF EXISTS commission_rate;
ALTER TABLE orders RENAME COLUMN commission_amount TO commission;
