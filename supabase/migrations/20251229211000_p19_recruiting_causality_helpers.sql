-- PROMOTION 19
-- Add helper indexes + a causality view to traverse:
-- program_recruits -> latest recruiting snapshot -> upstream A1 canonical event -> canonical_event_links edge
-- This is read-only and meant for auditing / UI drill-down.

-- Canonical links traversal index (if not already present)
create index if not exists canonical_event_links_from_type_idx
  on public.canonical_event_links(from_canonical_event_id, link_type);

create index if not exists canonical_event_links_to_type_idx
  on public.canonical_event_links(to_canonical_event_id, link_type);

-- Recruiting snapshots access path
create index if not exists recruiting_snapshots_program_recruit_created_idx
  on public.recruiting_snapshots(program_id, recruit_id, created_at desc);

-- Causality drill-down view
create or replace view public.recruiting_causality_v1 as
select
  pr.program_id,
  pr.id as program_recruit_id,
  pr.recruit_id,

  lrs.canonical_event_id as recruiting_canonical_event_id,
  lrs.created_at as recruiting_emitted_at,
  lrs.recruiting_score,
  lrs.confidence,
  lrs.horizon,

  lrs.upstream_a1_canonical_event_id as a1_canonical_event_id,

  cel.id as a1_to_recruiting_link_id,
  cel.link_type as a1_to_recruiting_link_type,
  cel.created_at as link_created_at

from public.program_recruits pr
left join public.latest_recruiting_snapshot lrs
  on lrs.program_id = pr.program_id
 and lrs.recruit_id = pr.recruit_id
left join public.canonical_event_links cel
  on cel.from_canonical_event_id = lrs.upstream_a1_canonical_event_id
 and cel.to_canonical_event_id = lrs.canonical_event_id
 and cel.link_type = 'a1_to_recruiting';

grant select on public.recruiting_causality_v1 to authenticated;

