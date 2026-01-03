-- Recruiting M1 bootstrap
-- Seed an initial stabilization signal based on current recruitable deficits
-- Non-authoritative; safe to re-run

insert into public.recruiting_state_signals (
  program_id,
  sport,
  horizon,
  signal_type,
  context
)
select
  r.program_id,
  r.sport,
  r.horizon,
  case
    when count(*) = 0 then 'within_tolerance'
    when count(*) <= 2 then 'approaching_boundary'
    else 'outside_tolerance'
  end as signal_type,
  jsonb_build_object(
    'seeded_from', 'recruiting_m1_bootstrap',
    'deficit_count', count(*)
  ) as context
from public.recruiting_recruitable_deficits r
left join public.recruiting_state_signals existing
  on existing.program_id = r.program_id
 and existing.sport = r.sport
 and existing.horizon = r.horizon
where existing.id is null
group by r.program_id, r.sport, r.horizon;
