-- Conversion layer: business leads (consult / contact requests).
-- Applied via `npm run migrations:run -- --write`.

create table if not exists leads (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  email      text not null,
  phone      text,
  company    text,
  message    text,
  interest   text,
  source     text default 'consult',
  article_id uuid,
  status     text not null default 'new',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists leads_status_idx on leads (status);
create index if not exists leads_created_idx on leads (created_at desc);
