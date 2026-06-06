-- Cross-day dedupe for trend-sourced topics. Additive.
-- Applied via `npm run migrations:run -- --write`.

create table if not exists trend_seen (
  key      text primary key,
  headline text,
  seen_at  timestamptz default now()
);

create index if not exists trend_seen_seen_at_idx on trend_seen (seen_at);
