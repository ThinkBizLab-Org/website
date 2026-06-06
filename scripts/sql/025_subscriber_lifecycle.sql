-- Subscriber lifecycle: welcome email + onboarding drip tracking. Additive.
-- Applied via `npm run migrations:run -- --write`.

alter table subscribers
  add column if not exists welcome_sent_at timestamptz,
  add column if not exists drip_step integer default 0,
  add column if not exists drip_last_sent_at timestamptz;
