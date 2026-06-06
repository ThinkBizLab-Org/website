-- Video approval gate + format-performance learning. Additive and nullable.
-- Applied via `npm run migrations:run -- --write`.

alter table articles
  add column if not exists video_format_used text,
  add column if not exists video_approved_at timestamptz,
  add column if not exists video_approved_by text;
