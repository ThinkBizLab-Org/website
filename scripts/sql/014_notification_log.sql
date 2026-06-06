create table if not exists notification_log (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  channel text not null,
  status text not null,
  title text,
  message text,
  error text,
  context jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  constraint notification_log_event_check check (event in ('dead_letter', 'ready_for_approval', 'published')),
  constraint notification_log_channel_check check (channel in ('line', 'slack', 'email')),
  constraint notification_log_status_check check (status in ('sent', 'failed', 'skipped'))
);

create index if not exists notification_log_event_idx on notification_log (event);
create index if not exists notification_log_channel_idx on notification_log (channel);
create index if not exists notification_log_status_idx on notification_log (status);
create index if not exists notification_log_created_idx on notification_log (created_at);
