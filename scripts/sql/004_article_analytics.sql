create table if not exists article_page_views (
  id uuid primary key default gen_random_uuid(),
  article_id uuid,
  slug text not null,
  path text not null,
  referrer text,
  user_agent text,
  created_at timestamptz default now()
);

create index if not exists article_page_views_article_idx on article_page_views (article_id);
create index if not exists article_page_views_slug_idx on article_page_views (slug);
create index if not exists article_page_views_created_idx on article_page_views (created_at desc);
