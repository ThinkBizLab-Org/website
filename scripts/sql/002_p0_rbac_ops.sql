create table if not exists schema_migrations (
  id text primary key,
  checksum text not null,
  applied_at timestamptz default now()
);

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  role text not null default 'editor',
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint admin_users_role_check check (role in ('owner', 'admin', 'editor', 'viewer'))
);

create index if not exists admin_users_role_idx on admin_users (role);
create index if not exists admin_users_active_idx on admin_users (active);
