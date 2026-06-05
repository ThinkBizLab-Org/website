ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS segment text DEFAULT 'general';
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS consent_token text;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS unsubscribe_token text;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscribers_consent_token ON subscribers(consent_token) WHERE consent_token IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscribers_unsubscribe_token ON subscribers(unsubscribe_token) WHERE unsubscribe_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscribers_segment ON subscribers(segment);
CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers(status);

UPDATE subscribers
SET
  status = CASE WHEN status = 'subscribed' THEN 'active' ELSE status END,
  segment = COALESCE(segment, 'general'),
  updated_at = COALESCE(updated_at, now())
WHERE status = 'subscribed' OR segment IS NULL OR updated_at IS NULL;
