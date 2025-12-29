-- PROMOTION 15
-- Provide a stable derived read model for "latest recruiting evaluation" per (program_id, recruit_id).
-- No governed writes; this is a read-only view for fast board/UI access.

create or replace view public.latest_recruiting_snapshot as
select distinct on (rs.program_id, rs.recruit_id)
  rs.program_id,
  rs.recruit_id,
  rs.canonical_event_id,
  rs.a1_canonical_event_id as upstream_a1_canonical_event_id,
  rs.recruiting_score,
  rs.ai_confidence as confidence,
  rs.horizon,
  rs.created_at
from public.recruiting_snapshots rs
order by rs.program_id, rs.recruit_id, rs.created_at desc, rs.canonical_event_id desc;
