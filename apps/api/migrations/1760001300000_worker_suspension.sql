-- Up Migration

-- An approved worker can be suspended: hidden from the catalog and unable to take new orders, while
-- orders already placed run to completion. Sample and existing workers keep their current status.
ALTER TABLE workers DROP CONSTRAINT IF EXISTS workers_status_check;
ALTER TABLE workers
  ADD CONSTRAINT workers_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'suspended'));

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_kind_check;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_kind_check CHECK (
    kind IN (
      'order_new',
      'worker_application_received',
      'worker_approved',
      'worker_rejected',
      'worker_suspended'
    )
  );

-- Down Migration
UPDATE workers SET status = 'rejected' WHERE status = 'suspended';
ALTER TABLE workers DROP CONSTRAINT IF EXISTS workers_status_check;
ALTER TABLE workers
  ADD CONSTRAINT workers_status_check CHECK (status IN ('pending', 'approved', 'rejected'));
DELETE FROM notifications WHERE kind = 'worker_suspended';
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_kind_check;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_kind_check CHECK (
    kind IN ('order_new', 'worker_application_received', 'worker_approved', 'worker_rejected')
  );
