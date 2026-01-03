-- recruiting(m3): materialize candidate impacts from recruitable deficits + candidate facts
-- advisory-only, comparative, non-authoritative

begin;

-- materializer function (idempotent replace)
create or replace function public.materialize_recruiting_candidate_impacts(
  p_program_id uuid,
  p_sport text,
  p_horizon text,
  p_inputs_hash text
)
returns integer
language plpgsql
security definer
as $$
declare
  v_inserted integer := 0;
begin
  /*
    Strategy:
    - Consume ONLY recruitable deficits (M1 contract)
    - Join to recruiting-owned candidate facts
    - Compute bounded impact + cohort tier
    - Write one row per candidate × deficit
    - No mutation of Program Health
  */

  insert into public.recruiting_candidate_impacts (
    program_id,
    recruit_id,
    sport,
    horizon,
    capability_node_id,
    impact_score,
    cohort_tier,
    rationale,
    inputs_hash
  )
  select
    d.program_id,
    r.id as recruit_id,
    p_sport as sport,
    p_horizon as horizon,
    d.capability_node_id,

    /* bounded marginal impact score */
    greatest(
      0,
      least(
        1,
        coalesce(ev.coverage_weight, 0)
        * coalesce(ev.fit_confidence, 0)
        * coalesce(ev.time_alignment, 0)
      )
    ) as impact_score,

    /* cohort tiering (relative, non-authoritative) */
    case
      when coalesce(ev.coverage_weight, 0) >= 0.7 then 0  -- high contribution
      when coalesce(ev.coverage_weight, 0) >= 0.4 then 1  -- moderate
      when coalesce(ev.coverage_weight, 0) >  0.0 then 2  -- exploratory
      else 3                                             -- negligible
    end as cohort_tier,

    jsonb_build_object(
      'coverage', coalesce(ev.coverage_weight, 0),
      'confidence', coalesce(ev.fit_confidence, 0),
      'time_alignment', coalesce(ev.time_alignment, 0),
      'notes', ev.rationale
    ) as rationale,

    p_inputs_hash as inputs_hash

  from public.recruiting_recruitable_deficits d
  join public.recruits r
    on r.program_id = d.program_id
  left join public.recruiting_candidate_evaluations ev
    on ev.recruit_id = r.id
   and ev.capability_node_id = d.capability_node_id

  where d.program_id = p_program_id
    and d.sport = p_sport
    and d.horizon = p_horizon

  on conflict do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

comment on function public.materialize_recruiting_candidate_impacts is
'M3 advisory materializer: computes marginal stabilization contribution per candidate × recruitable deficit';

commit;
