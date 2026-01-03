-- Recruiting M1 RPC
-- Canonical read entry for recruitable deficits only

create or replace function public.rpc_recruiting_recruitable_deficits(
  p_program_id uuid,
  p_sport text,
  p_horizon text
)
returns table (
  program_id uuid,
  sport text,
  horizon text,
  capability_node_id uuid,
  severity text,
  absence_key text,
  created_at timestamptz,
  canonical_event_id uuid,
  ledger_id uuid
)
language sql
stable
as $$
  select
    rrd.program_id,
    rrd.sport,
    rrd.horizon,
    rrd.capability_node_id,
    rrd.severity,
    rrd.absence_key,
    rrd.created_at,
    rrd.canonical_event_id,
    rrd.ledger_id
  from public.recruiting_recruitable_deficits rrd
  where rrd.program_id = p_program_id
    and rrd.sport = p_sport
    and rrd.horizon = p_horizon;
$$;

comment on function public.rpc_recruiting_recruitable_deficits is
'Recruiting M1 RPC: returns ONLY recruitable deficits scoped by program, sport, and horizon.';
