-- Up Migration

-- Complaints get an "in review" step and an administrator's note; reviews keep the reason they
-- were hidden for.
ALTER TABLE complaints DROP CONSTRAINT IF EXISTS complaints_status_check;
ALTER TABLE complaints
  ADD CONSTRAINT complaints_status_check
    CHECK (status IN ('open', 'in_review', 'resolved', 'dismissed')),
  ADD COLUMN admin_note text CHECK (admin_note IS NULL OR char_length(admin_note) <= 1000),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
DROP INDEX IF EXISTS complaints_one_open_per_user_idx;
CREATE UNIQUE INDEX complaints_one_open_per_user_idx
  ON complaints (order_id, user_id) WHERE status IN ('open', 'in_review');

ALTER TABLE reviews
  ADD COLUMN moderation_reason text
    CHECK (moderation_reason IS NULL OR char_length(moderation_reason) <= 300);

-- One row of platform settings; the commission rate is a code constant and is not stored here.
CREATE TABLE platform_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  accept_applications boolean NOT NULL DEFAULT true,
  announcement_uz text CHECK (announcement_uz IS NULL OR char_length(announcement_uz) <= 300),
  announcement_ru text CHECK (announcement_ru IS NULL OR char_length(announcement_ru) <= 300),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users (id) ON DELETE SET NULL
);
INSERT INTO platform_settings (id) VALUES (1);

-- Down Migration
DROP TABLE IF EXISTS platform_settings;
ALTER TABLE reviews DROP COLUMN IF EXISTS moderation_reason;
DROP INDEX IF EXISTS complaints_one_open_per_user_idx;
UPDATE complaints SET status = 'open' WHERE status = 'in_review';
ALTER TABLE complaints
  DROP COLUMN IF EXISTS admin_note,
  DROP COLUMN IF EXISTS updated_at,
  DROP CONSTRAINT IF EXISTS complaints_status_check;
ALTER TABLE complaints
  ADD CONSTRAINT complaints_status_check CHECK (status IN ('open', 'resolved', 'dismissed'));
CREATE UNIQUE INDEX complaints_one_open_per_user_idx
  ON complaints (order_id, user_id) WHERE status = 'open';
