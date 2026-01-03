-- Recruiting M1 UI support
-- Computes high-level stabilization status bands from recruitable deficits
-- No completion semantics; advisory-only tone

create or replace function public.rpc_recruiting_stabilization_status(
  p_program_id uuid,
  p_sport text,
  p_horizon text default null
)
returns table (
  horizon text,
  status_band text,
  deficit_count integer,
  max_severity text,
  computed_at timestamptz
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
  ),
  deficits as (
    select
      rrd.severity
    from public.recruiting_recruitable_deficits rrd
    join resolved_horizon rh on rrd.horizon = rh.horizon
    where rrd.program_id = p_program_id
      and rrd.sport = p_sport
  )
  select
    rh.horizon,
    case
      when count(*) = 0 then 'within_tolerance'
      when count(*) <= 2 then 'approaching_boundary'
      else 'outside_tolerance'
    end as status_band,
    count(*)::integer as deficit_count,
    max(deficits.severity) as max_severity,
    now() as computed_at
  from resolved_horizon rh
  left join deficits on true
  group by rh.horizon;
$$;

grant execute on function public.rpc_recruiting_stabilization_status(uuid, text, text) to authenticated;

comment on function public.rpc_recruiting_stabilization_status is
'Recruiting M1 RPC: derives stabilization status band from recruitable deficits without declaring completion.';
