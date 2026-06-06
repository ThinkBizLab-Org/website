alter table dead_letter_queue add column if not exists auto_retries integer default 0;
