create table if not exists dead_letter_queue (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_id uuid,
  article_id uuid references articles(id) on delete set null,
  reference text,
  payload jsonb default '{}'::jsonb,
  attempts integer default 0,
  error text,
  status text not null default 'pending',
  resolved_by text,
  failed_at timestamptz default now(),
  resolved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint dead_letter_queue_source_check check (source in ('social_post_queue', 'media_production_queue')),
  constraint dead_letter_queue_status_check check (status in ('pending', 'requeued', 'discarded'))
);

create index if not exists dead_letter_queue_status_idx on dead_letter_queue (status);
create index if not exists dead_letter_queue_source_idx on dead_letter_queue (source);
create index if not exists dead_letter_queue_article_idx on dead_letter_queue (article_id);
create index if not exists dead_letter_queue_source_item_idx on dead_letter_queue (source, source_id);
create index if not exists dead_letter_queue_failed_idx on dead_letter_queue (failed_at);
