create table if not exists article_revisions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null,
  version integer not null,
  action text not null,
  actor_email text,
  snapshot jsonb not null,
  created_at timestamptz default now()
);

create unique index if not exists article_revisions_article_version_idx
  on article_revisions (article_id, version);

create index if not exists article_revisions_article_created_idx
  on article_revisions (article_id, created_at desc);
