-- Video approval via LINE: short-lived token + de-dupe guard. Additive and nullable.
-- Mirrors the content-factory approval-token pattern so admins can approve a
-- rendered video from LINE (approve-video CODE) instead of only in Video Review.
-- Applied via `npm run migrations:run -- --write`.

alter table articles
  add column if not exists video_approval_token text,
  add column if not exists video_approval_token_expires_at timestamptz,
  add column if not exists video_approval_notified_at timestamptz;
