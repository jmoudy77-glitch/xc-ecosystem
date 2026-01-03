-- Recruiting M1 state signal
-- Records recruiting-side stabilization signals WITHOUT mutating Program Health diagnostics

create table if not exists public.recruiting_state_signals (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null,
  sport text not null check (sport in ('xc','tf')),
  horizon text not null check (horizon in ('H0','H1','H2','H3')),
  signal_type text not null check (signal_type in (
    'within_tolerance',
    'approaching_boundary',
    'outside_tolerance'
  )),
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by_event_id uuid
);

create index if not exists idx_recruiting_state_signals_program
on public.recruiting_state_signals (program_id, sport, horizon, created_at desc);

comment on table public.recruiting_state_signals is
'Recruiting feedback channel: stabilization signals emitted by Recruiting, non-diagnostic, non-authoritative.';

