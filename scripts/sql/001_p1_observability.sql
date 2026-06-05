CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  actor_email text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS publish_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  article_id uuid,
  platform text NOT NULL,
  status text NOT NULL,
  mode text DEFAULT 'manual',
  error text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx
  ON audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS publish_attempts_created_at_idx
  ON publish_attempts (created_at DESC);

CREATE INDEX IF NOT EXISTS publish_attempts_article_id_idx
  ON publish_attempts (article_id);
