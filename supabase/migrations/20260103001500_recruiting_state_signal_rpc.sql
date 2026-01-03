-- Recruiting M1 RPC
-- Read latest stabilization signal per program/sport/horizon
-- Non-authoritative, advisory only

create or replace function public.rpc_recruiting_latest_state_signal(
  p_program_id uuid,
  p_sport text,
  p_horizon text
)
returns table (
  id uuid,
  signal_type text,
  context jsonb,
  created_at timestamptz,
  created_by_event_id uuid
)
language sql
stable
as $$
  select
    rss.id,
    rss.signal_type,
    rss.context,
    rss.created_at,
    rss.created_by_event_id
  from public.recruiting_state_signals rss
  where rss.program_id = p_program_id
    and rss.sport = p_sport
    and rss.horizon = p_horizon
  order by rss.created_at desc
  limit 1;
$$;

comment on function public.rpc_recruiting_latest_state_signal is
'Recruiting M1 RPC: returns latest non-authoritative stabilization signal for UI consumption.';
