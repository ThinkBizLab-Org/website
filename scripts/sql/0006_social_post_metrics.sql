-- Platform analytics: per-post engagement snapshots (IG/FB/TikTok).
-- Applied via `npm run migrations:run -- --write`.

create table if not exists social_post_metrics (
  id         uuid primary key default gen_random_uuid(),
  platform   text not null,
  article_id uuid,
  post_id    text,
  views      integer default 0,
  likes      integer default 0,
  comments   integer default 0,
  shares     integer default 0,
  fetched_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists social_post_metrics_article_idx on social_post_metrics (article_id);
create index if not exists social_post_metrics_fetched_idx on social_post_metrics (fetched_at);
