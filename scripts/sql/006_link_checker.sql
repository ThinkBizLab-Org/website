CREATE TABLE IF NOT EXISTS link_check_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid,
  article_title text,
  article_slug text,
  url text NOT NULL,
  normalized_url text NOT NULL,
  link_type text NOT NULL,
  source_field text NOT NULL DEFAULT 'content',
  status text NOT NULL,
  status_code integer,
  error text,
  checked_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_link_check_results_status ON link_check_results(status);
CREATE INDEX IF NOT EXISTS idx_link_check_results_checked_at ON link_check_results(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_link_check_results_article_id ON link_check_results(article_id);
