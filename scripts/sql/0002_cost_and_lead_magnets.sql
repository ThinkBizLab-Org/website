-- Media cost tracking + lead magnet download audit. Additive and nullable.
-- Applied via `npm run migrations:run -- --write`.

-- Direct USD cost for non-token (image/video/tts) AI usage; token-based rows
-- leave this null and are priced from token counts at read time.
alter table ai_usage
  add column if not exists cost_usd double precision;

-- Records which email requested which lead magnet (content upgrade) download.
create table if not exists lead_magnet_downloads (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  magnet     text not null,
  source     text default 'lead-magnet',
  article_id uuid,
  created_at timestamptz default now()
);

create index if not exists lead_magnet_downloads_email_idx on lead_magnet_downloads (email);
create index if not exists lead_magnet_downloads_created_idx on lead_magnet_downloads (created_at desc);
