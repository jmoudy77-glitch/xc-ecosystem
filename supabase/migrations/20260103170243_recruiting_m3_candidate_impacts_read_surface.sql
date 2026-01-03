-- recruiting(m3): read surface for candidate impact cohorts
-- comparative, advisory-only, no authority language

begin;

-- stable view: one row per candidate, aggregated across deficits
create or replace view public.recruiting_candidate_impact_cohorts as
select
  rci.program_id,
  rci.recruit_id,
  rci.sport,
  rci.horizon,

  min(rci.cohort_tier) as best_cohort_tier,
  sum(rci.impact_score) as total_impact_score,
  count(*) as deficit_touch_count,

  jsonb_agg(
    jsonb_build_object(
      'capability_node_id', rci.capability_node_id,
      'impact_score', rci.impact_score,
      'cohort_tier', rci.cohort_tier,
      'rationale', rci.rationale
    )
    order by rci.impact_score desc
  ) as impacts_detail,

  max(rci.created_at) as computed_at,
  rci.inputs_hash

from public.recruiting_candidate_impacts rci
group by
  rci.program_id,
  rci.recruit_id,
  rci.sport,
  rci.horizon,
  rci.inputs_hash;

comment on view public.recruiting_candidate_impact_cohorts is
'M3 advisory read model: aggregates candidate impacts into comparative cohorts; no completion semantics';

-- rpc wrapper with explicit horizon + sport
create or replace function public.rpc_recruiting_candidate_impact_cohorts(
  p_program_id uuid,
  p_sport text,
  p_horizon text
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
    total_impact_score desc;
$$;

comment on function public.rpc_recruiting_candidate_impact_cohorts is
'M3 advisory RPC: returns candidate cohorts ranked comparatively by impact under current recruitable deficits';

-- RLS passthrough (view relies on base table RLS)
grant select on public.recruiting_candidate_impact_cohorts to authenticated;
grant execute on function public.rpc_recruiting_candidate_impact_cohorts(uuid, text, text) to authenticated;

commit;
