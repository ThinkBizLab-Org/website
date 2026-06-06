-- Expand the allowed notification events to include budget_paused and ops_digest.
alter table notification_log drop constraint if exists notification_log_event_check;
alter table notification_log add constraint notification_log_event_check
  check (event in ('dead_letter', 'ready_for_approval', 'published', 'budget_paused', 'ops_digest'));
