-- Recruiting M1 observability
-- Read-only audit surface for inspecting what Recruiting actually sees
-- No write paths, no inference, no authority

create or replace view public.recruiting_m1_audit_view as
select
  rrd.program_id,
  rrd.sport,
  rrd.horizon,
  rrd.capability_node_id,
  rrd.absence_key,
  rrd.severity,
  rrd.created_at,
  rrd.canonical_event_id,
  rrd.ledger_id
from public.recruiting_recruitable_deficits rrd;

comment on view public.recruiting_m1_audit_view is
'Audit-only view: exact recruitable deficits visible to Recruiting after all boundary filters.';
