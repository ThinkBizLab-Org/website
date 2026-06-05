create table if not exists social_post_queue (
  id uuid primary key default gen_random_uuid(),
  article_id uuid,
  platform text not null,
  status text not null default 'queued',
  payload jsonb,
  attempts integer default 0,
  error text,
  scheduled_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint social_post_queue_status_check check (status in ('queued', 'processing', 'success', 'failed', 'cancelled'))
);

create index if not exists social_post_queue_status_idx on social_post_queue (status);
create index if not exists social_post_queue_article_idx on social_post_queue (article_id);
create index if not exists social_post_queue_scheduled_idx on social_post_queue (scheduled_at);
