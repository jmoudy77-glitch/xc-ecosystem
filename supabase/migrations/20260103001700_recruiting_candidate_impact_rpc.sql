-- Recruiting M3 RPC
-- Returns ranked candidate cohorts for a given program/sport/horizon
-- Advisory-only, comparative posture

create or replace function public.rpc_recruiting_ranked_candidates(
  p_program_id uuid,
  p_sport text,
  p_horizon text,
  p_max_tier integer default 3
)
returns table (
  recruit_id uuid,
  capability_node_id uuid,
  impact_score numeric,
  cohort_tier integer,
  rationale jsonb,
  created_at timestamptz
)
language sql
stable
as $$
  select
    rci.recruit_id,
    rci.capability_node_id,
    rci.impact_score,
    rci.cohort_tier,
    rci.rationale,
    rci.created_at
  from public.recruiting_candidate_impacts rci
  where rci.program_id = p_program_id
    and rci.sport = p_sport
    and rci.horizon = p_horizon
    and rci.cohort_tier <= p_max_tier
  order by rci.cohort_tier asc, rci.impact_score desc;
$$;

comment on function public.rpc_recruiting_ranked_candidates is
'Recruiting M3 RPC: ranked advisory cohorts of recruits by deficit-reduction impact.';
