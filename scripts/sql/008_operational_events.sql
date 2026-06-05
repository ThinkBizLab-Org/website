CREATE TABLE IF NOT EXISTS operational_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text NOT NULL DEFAULT 'thinkbiz-app',
  severity text NOT NULL DEFAULT 'error',
  name text NOT NULL,
  message text NOT NULL,
  context jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operational_events_created_at ON operational_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operational_events_severity ON operational_events(severity);
CREATE INDEX IF NOT EXISTS idx_operational_events_name ON operational_events(name);
