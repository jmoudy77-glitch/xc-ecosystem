-- recruiting(m3): enrich cohort read model with recruit display name
-- advisory-only; no changes to compute semantics

begin;

create or replace view public.recruiting_candidate_impact_cohorts as
with agg as (
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
    rci.inputs_hash
)
select
  a.*,
  nullif(trim(concat_ws(' ', r.first_name, r.last_name)), '') as recruit_name
from agg a
left join public.recruits r
  on r.id = a.recruit_id;

comment on view public.recruiting_candidate_impact_cohorts is
'M3 advisory read model: aggregates candidate impacts into comparative cohorts; includes recruit_name for UI; no completion semantics';

-- refresh grants (safe even if already granted)
grant select on public.recruiting_candidate_impact_cohorts to authenticated;

commit;
