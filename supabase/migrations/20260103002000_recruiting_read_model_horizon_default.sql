-- Recruiting M1 hardening
-- Deterministic horizon defaulting for Recruiting reads
-- Prefers latest available Program Health horizon when unspecified

create or replace function public.rpc_recruiting_recruitable_deficits_default_horizon(
  p_program_id uuid,
  p_sport text,
  p_horizon text default null
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
  with resolved_horizon as (
    select coalesce(
      p_horizon,
      (
        select phs.horizon
        from public.program_health_snapshots phs
        where phs.program_id = p_program_id
          and phs.sport = p_sport
        order by phs.created_at desc
        limit 1
      )
    ) as horizon
  )
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
  join resolved_horizon rh on rrd.horizon = rh.horizon
  where rrd.program_id = p_program_id
    and rrd.sport = p_sport;
$$;

grant execute on function public.rpc_recruiting_recruitable_deficits_default_horizon(uuid, text, text) to authenticated;

comment on function public.rpc_recruiting_recruitable_deficits_default_horizon is
'Recruiting M1 RPC: recruitable deficits with deterministic horizon defaulting to latest Program Health snapshot.';
