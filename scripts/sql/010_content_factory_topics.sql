create table if not exists content_factory_topics (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  category text,
  tags text[],
  status text not null default 'planned',
  scheduled_at timestamptz not null,
  article_id uuid,
  approval_token text unique,
  approval_token_expires_at timestamptz,
  approved_at timestamptz,
  line_notified_at timestamptz,
  error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists content_factory_topics_scheduled_idx
  on content_factory_topics (scheduled_at);

create index if not exists content_factory_topics_status_idx
  on content_factory_topics (status);

create index if not exists content_factory_topics_article_idx
  on content_factory_topics (article_id);

create index if not exists content_factory_topics_approval_idx
  on content_factory_topics (approval_token);
