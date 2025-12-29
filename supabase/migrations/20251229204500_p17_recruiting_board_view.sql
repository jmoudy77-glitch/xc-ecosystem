-- PROMOTION 17
-- Provide a board-optimized read model:
-- - program_recruits is the program-scoped board surface
-- - recruits provides recruit identity fields
-- - latest_recruiting_snapshot provides the most recent evaluation + upstream A1 edge
--
-- This is read-only, intended for UI queries.

-- Indexes to support board reads
create index if not exists program_recruits_program_status_idx
  on public.program_recruits(program_id, status);

create index if not exists program_recruits_program_interest_idx
  on public.program_recruits(program_id, interest_level);

-- Board view
create or replace view public.recruiting_board_v1 as
select
  pr.id as program_recruit_id,
  pr.program_id,
  pr.recruiting_profile_id,
  pr.recruit_id,
  pr.athlete_id,
  pr.status,
  pr.source,
  pr.interest_level,
  pr.primary_coach_member_id,
  pr.created_at,
  pr.updated_at,

  -- Identity surface (global recruit)
  r.first_name,
  r.last_name,
  r.grad_year,
  r.event_group,
  r.pipeline_stage,
  r.interest_level as recruit_interest_level,
  r.probability,
  r.projected_points,
  r.last_contact_at,
  r.next_action_at,
  r.color_tag,
  r.recruiting_score as global_recruiting_score,

  -- Latest evaluation (derived)
  lrs.canonical_event_id as latest_recruiting_canonical_event_id,
  lrs.upstream_a1_canonical_event_id,
  lrs.recruiting_score as latest_recruiting_score,
  lrs.confidence as latest_recruiting_confidence,
  lrs.horizon as latest_recruiting_horizon,
  lrs.created_at as latest_recruiting_at

from public.program_recruits pr
left join public.recruits r
  on r.id = pr.recruit_id
left join public.latest_recruiting_snapshot lrs
  on lrs.program_id = pr.program_id
 and lrs.recruit_id = pr.recruit_id;

grant select on public.recruiting_board_v1 to authenticated;

