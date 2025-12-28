# Kernel v1 Verification Queries

These queries validate that the Canonical Kernel is emitting the universal event spine and that the seed mutation path (program_branding upsert) is kernel-bound.

---

## 1) Confirm canonical event emission (latest 50)

```sql
select
  id,
  program_id,
  event_domain,
  event_type,
  scope_type,
  scope_id,
  actor_user_id,
  source_system,
  created_at
from public.canonical_events
order by created_at desc
limit 50;
