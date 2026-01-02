-- Canonical violation registry (authoritative)
create table if not exists public.genesis_violation_registry (
  id uuid primary key default gen_random_uuid(),
  runtime_key text not null,
  violation_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
