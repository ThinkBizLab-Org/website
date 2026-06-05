CREATE TABLE IF NOT EXISTS backup_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'processing',
  trigger text NOT NULL DEFAULT 'manual',
  r2_key text,
  url text,
  size_bytes integer DEFAULT 0,
  error text,
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_backup_jobs_started_at ON backup_jobs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_jobs_status ON backup_jobs(status);
