-- Canonical runtime registry (authoritative)
create table if not exists public.genesis_runtime_registry (
  runtime_key text primary key,
  description text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
