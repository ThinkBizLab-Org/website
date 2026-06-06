alter table articles add column if not exists last_refreshed_at timestamptz;

alter table notification_log drop constraint if exists notification_log_event_check;
alter table notification_log add constraint notification_log_event_check
  check (event in ('dead_letter', 'ready_for_approval', 'published', 'budget_paused', 'ops_digest', 'stale_content'));
