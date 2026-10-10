-- Up Migration

-- Optional second contact channel, shown alongside the phone once an order is accepted.
-- Stored without the leading '@'; format is also checked by the shared zod schema on write.
ALTER TABLE workers
  ADD COLUMN telegram_username text
    CHECK (telegram_username IS NULL OR telegram_username ~ '^[A-Za-z0-9_]{5,32}$');

-- Down Migration
ALTER TABLE workers DROP COLUMN IF EXISTS telegram_username;
