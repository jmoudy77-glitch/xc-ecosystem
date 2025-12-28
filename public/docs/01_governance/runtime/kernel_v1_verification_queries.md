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

---

## Scholarship Binding v1 — team_roster allocation

### 1) Latest canonical_events for scholarship allocation

```sql
select
  id,
  program_id,
  event_type,
  scope_type,
  scope_id,
  actor_user_id,
  source_system,
  created_at
from public.canonical_events
where event_type = 'scholarship_allocation_upsert'
order by created_at desc
limit 50;
```

### 2) canonical_events → entitlement_ledger

```sql
select
  ce.id as canonical_event_id,
  ce.program_id,
  ce.scope_id as team_roster_id,
  el.entitlement_type,
  el.beneficiary_type,
  el.beneficiary_id,
  el.status,
  el.created_at
from public.canonical_events ce
join public.entitlement_ledger el
  on el.canonical_event_id = ce.id
where ce.event_type = 'scholarship_allocation_upsert'
order by el.created_at desc
limit 50;
```

### 3) team_roster projection state

```sql
select
  id,
  program_id,
  team_id,
  team_season_id,
  athlete_id,
  scholarship_unit,
  scholarship_amount,
  scholarship_notes,
  updated_at
from public.team_roster
order by updated_at desc
limit 50;
```
