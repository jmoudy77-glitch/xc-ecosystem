-- Recruiting M1 read model
-- Exposes ONLY recruitable absences derived from Program Health
-- Enforces hard boundary: non_recruitable absences are invisible to Recruiting

create or replace view public.recruiting_recruitable_deficits as
select
  pha.program_id,
  pha.sport,
  pha.horizon,
  pha.capability_node_id,
  pha.severity,
  pha.absence_key,
  pha.created_at,
  pha.canonical_event_id,
  pha.ledger_id,
  pha.details->>'recruitability' as recruitability
from public.program_health_absences pha
where
  pha.details->>'recruitability' = 'recruitable';

comment on view public.recruiting_recruitable_deficits is
'Recruiting read model: strictly recruitable deficits only. Non-recruitable absences are excluded by construction.';
