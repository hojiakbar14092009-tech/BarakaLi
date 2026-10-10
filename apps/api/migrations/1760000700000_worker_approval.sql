-- Up Migration

-- Worker applications. Every worker that exists when this migration runs (real accounts and the
-- sample workers alike) stays visible: they are marked approved. Only applications submitted from
-- now on start as pending, which is the column default set below.
ALTER TABLE workers
  ADD COLUMN status text NOT NULL DEFAULT 'approved'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN reviewed_by uuid REFERENCES users (id) ON DELETE SET NULL,
  ADD COLUMN reviewed_at timestamptz,
  ADD COLUMN reject_reason text;

ALTER TABLE workers ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE workers
  ADD CONSTRAINT workers_reject_reason_required
    CHECK (status <> 'rejected' OR char_length(btrim(reject_reason)) >= 10);

-- The "verified" badge is derived from status = 'approved'; a hand-set flag no longer exists.
ALTER TABLE workers DROP COLUMN is_verified;

CREATE INDEX workers_status_idx ON workers (status, created_at DESC);

-- Notification kinds for the application lifecycle; `detail` carries the rejection reason.
ALTER TABLE notifications DROP CONSTRAINT notifications_kind_check;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_kind_check CHECK (
    kind IN ('order_new', 'worker_application_received', 'worker_approved', 'worker_rejected')
  );
ALTER TABLE notifications ADD COLUMN detail text;

-- Down Migration
ALTER TABLE notifications DROP COLUMN IF EXISTS detail;
DELETE FROM notifications WHERE kind <> 'order_new';
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_kind_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_kind_check CHECK (kind IN ('order_new'));
ALTER TABLE workers ADD COLUMN is_verified boolean NOT NULL DEFAULT false;
UPDATE workers SET is_verified = (status = 'approved');
DROP INDEX IF EXISTS workers_status_idx;
ALTER TABLE workers DROP CONSTRAINT IF EXISTS workers_reject_reason_required;
ALTER TABLE workers
  DROP COLUMN IF EXISTS reject_reason,
  DROP COLUMN IF EXISTS reviewed_at,
  DROP COLUMN IF EXISTS reviewed_by,
  DROP COLUMN IF EXISTS status;
