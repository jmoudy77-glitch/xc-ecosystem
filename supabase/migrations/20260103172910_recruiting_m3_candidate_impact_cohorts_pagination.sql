-- recruiting(m3): performance guardrails for cohort RPC
-- Adds limit/offset params to avoid unbounded payloads.

begin;

create or replace function public.rpc_recruiting_candidate_impact_cohorts(
  p_program_id uuid,
  p_sport text,
  p_horizon text,
  p_limit integer default 50,
  p_offset integer default 0
)
returns setof public.recruiting_candidate_impact_cohorts
language sql
security definer
as $$
  select *
  from public.recruiting_candidate_impact_cohorts
  where program_id = p_program_id
    and sport = p_sport
    and horizon = p_horizon
  order by
    best_cohort_tier asc,
    total_impact_score desc
  limit greatest(0, least(p_limit, 200))
  offset greatest(0, p_offset);
$$;

comment on function public.rpc_recruiting_candidate_impact_cohorts(uuid, text, text, integer, integer) is
'M3 advisory RPC: returns candidate cohorts ranked comparatively by impact; bounded via limit/offset';

revoke all on function public.rpc_recruiting_candidate_impact_cohorts(uuid, text, text, integer, integer) from public;
grant execute on function public.rpc_recruiting_candidate_impact_cohorts(uuid, text, text, integer, integer) to authenticated;

commit;
