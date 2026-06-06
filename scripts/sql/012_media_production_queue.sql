create table if not exists media_production_queue (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references articles(id) on delete set null,
  asset_type text not null,
  status text not null default 'queued',
  payload jsonb default '{}'::jsonb,
  provider_job_id text,
  result_url text,
  result_key text,
  attempts integer default 0,
  error text,
  scheduled_at timestamptz default now(),
  processed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint media_production_queue_asset_type_check check (asset_type in ('cover_image', 'instagram_image', 'short_video')),
  constraint media_production_queue_status_check check (status in ('queued', 'processing', 'waiting', 'success', 'failed', 'cancelled'))
);

create index if not exists media_production_queue_status_idx on media_production_queue (status);
create index if not exists media_production_queue_article_idx on media_production_queue (article_id);
create index if not exists media_production_queue_scheduled_idx on media_production_queue (scheduled_at);
create index if not exists media_production_queue_asset_idx on media_production_queue (asset_type);
