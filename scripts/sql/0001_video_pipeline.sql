-- Hybrid short-video pipeline: AI-emitted scene manifest + render progress.
-- Additive and nullable, so existing rows and the current HeyGen path are
-- unaffected. Applied via `npm run migrations:run -- --write`.

alter table articles
  add column if not exists video_plan jsonb,
  add column if not exists video_format text;

alter table media_production_queue
  add column if not exists stage text,
  add column if not exists progress jsonb;
