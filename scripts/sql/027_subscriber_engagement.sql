-- Email engagement tracking + re-engagement. Additive.
-- Applied via `npm run migrations:run -- --write`.

alter table subscribers
  add column if not exists last_engaged_at timestamptz,
  add column if not exists open_count integer default 0,
  add column if not exists click_count integer default 0,
  add column if not exists reengaged_at timestamptz;
