create table if not exists ai_usage (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  model text not null,
  input_tokens integer default 0,
  output_tokens integer default 0,
  status text not null default 'success',
  article_id uuid,
  created_at timestamptz default now(),
  constraint ai_usage_kind_check check (kind in ('brief', 'article', 'fact_check')),
  constraint ai_usage_status_check check (status in ('success', 'failed'))
);

create index if not exists ai_usage_created_idx on ai_usage (created_at);
create index if not exists ai_usage_kind_idx on ai_usage (kind);
create index if not exists ai_usage_status_idx on ai_usage (status);
