-- Up Migration

-- Catering enquiries from the landing page. Not an order: no price, no payment; the team calls back.
-- service_type_id mirrors CATERING_SERVICE_IDS in packages/shared.
CREATE TABLE catering_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  service_type_id text NOT NULL
    CHECK (service_type_id IN ('tikuvchilik', 'pishiriq', 'qolmehnat', 'dizayn', 'boshqa')),
  event_date date NOT NULL,
  guests_count integer NOT NULL CHECK (guests_count >= 1),
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX catering_requests_status_created_idx ON catering_requests (status, created_at DESC);

-- Down Migration
DROP TABLE IF EXISTS catering_requests;
