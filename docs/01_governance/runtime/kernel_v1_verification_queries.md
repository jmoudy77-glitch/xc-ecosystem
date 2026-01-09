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
```

---

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

---

## Scholarship Budget Binding v1 — team_season allocation

### 1) Latest canonical_events for scholarship budgets

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
where event_type = 'scholarship_budget_upsert'
order by created_at desc
limit 50;
```

### 2) canonical_events → entitlement_ledger (team_season)

```sql
select
  ce.id as canonical_event_id,
  ce.program_id,
  ce.scope_id as team_season_id,
  el.entitlement_type,
  el.beneficiary_type,
  el.beneficiary_id,
  el.status,
  el.created_at
from public.canonical_events ce
join public.entitlement_ledger el
  on el.canonical_event_id = ce.id
where ce.event_type = 'scholarship_budget_upsert'
order by el.created_at desc
limit 50;
```

### 3) team_seasons projection state

```sql
select
  id,
  program_id,
  scholarship_budget_equivalents,
  scholarship_budget_amount,
  scholarship_currency,
  updated_at
from public.team_seasons
order by updated_at desc
limit 50;
```

---

## AI Output Binding v1 — ai_causal_ledger

### 1) Latest canonical_events for AI outputs

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
where event_type = 'ai_output_emitted'
order by created_at desc
limit 50;
```

### 2) canonical_events → ai_causal_ledger

```sql
select
  ce.id as canonical_event_id,
  ce.program_id,
  ce.scope_type,
  ce.scope_id,
  al.model_version,
  al.tier,
  al.inputs_fingerprint,
  al.confidence,
  al.created_at
from public.canonical_events ce
join public.ai_causal_ledger al
  on al.canonical_event_id = ce.id
where ce.event_type = 'ai_output_emitted'
order by al.created_at desc
limit 50;
```

---

## Athlete Identity Merge v1 — canonical_events → athlete_identity_events

### 1) Latest canonical_events for athlete merges

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
where event_type = 'athlete_merged'
order by created_at desc
limit 50;
```

### 2) canonical_events → athlete_identity_events

```sql
select
  ce.id as canonical_event_id,
  ce.program_id,
  ce.scope_id as canonical_athlete_id,
  aie.source_athlete_id,
  aie.actor_user_id,
  aie.created_at
from public.canonical_events ce
join public.athlete_identity_events aie
  on (aie.details->>'canonical_event_id')::uuid = ce.id
where ce.event_type = 'athlete_merged'
order by aie.created_at desc
limit 50;
```

## Stripe → Economic Ledger (Kernel-bound)

### 1) Latest economic canonical events
select
  id,
  program_id,
  event_domain,
  event_type,
  scope_type,
  scope_id,
  source_system,
  created_at
from public.canonical_events
where event_domain = 'economic'
order by created_at desc
limit 25;

### 2) Join canonical_events -> economic_ledger
select
  ce.id as canonical_event_id,
  ce.program_id,
  ce.event_type as ledger_type,
  el.amount,
  el.currency,
  el.external_ref,
  el.status,
  ce.created_at
from public.canonical_events ce
join public.economic_ledger el
  on el.canonical_event_id = ce.id
where ce.event_domain = 'economic'
order by ce.created_at desc
limit 25;

## AI Output Binding v1 — ai_causal_ledger (Kernel-bound)

### 1) Latest AI canonical events
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
where event_domain = 'ai'
  and event_type = 'ai_output_emitted'
order by created_at desc
limit 25;

### 2) Join canonical_events -> ai_causal_ledger
select
  ce.id as canonical_event_id,
  ce.program_id,
  ce.scope_type,
  ce.scope_id,
  acl.model_version,
  acl.tier,
  acl.inputs_fingerprint,
  acl.confidence,
  acl.drivers_json,
  acl.data_lineage,
  acl.output_json,
  ce.created_at
from public.canonical_events ce
join public.ai_causal_ledger acl
  on acl.canonical_event_id = ce.id
where ce.event_domain = 'ai'
  and ce.event_type = 'ai_output_emitted'
order by ce.created_at desc
limit 25;

## Athlete Identity Merge v1 — canonical_events + athlete_identity_events (Kernel-bound)

### 1) Latest identity canonical events
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
where event_domain = 'identity'
  and event_type = 'athlete_merged'
order by created_at desc
limit 25;

### 2) Join canonical_events -> athlete_identity_events (by canonical_event_id)
select
  ce.id as canonical_event_id,
  ce.program_id,
  aie.event_type,
  aie.canonical_athlete_id,
  aie.source_athlete_id,
  aie.actor_user_id,
  aie.details,
  ce.created_at
from public.canonical_events ce
join public.athlete_identity_events aie
  on aie.canonical_event_id = ce.id
where ce.event_domain = 'identity'
  and ce.event_type = 'athlete_merged'
order by ce.created_at desc
limit 25;

### 3) Post-merge pointer audit (counts of rows still pointing at source)
-- Replace :source_athlete_id with the source athlete id you merged.
select 'program_athletes' as table_name, count(*) as remaining from public.program_athletes where athlete_id = :source_athlete_id
union all
select 'team_roster', count(*) from public.team_roster where athlete_id = :source_athlete_id
union all
select 'athlete_media', count(*) from public.athlete_media where athlete_id = :source_athlete_id
union all
select 'athlete_performances', count(*) from public.athlete_performances where athlete_id = :source_athlete_id
union all
select 'athlete_scores', count(*) from public.athlete_scores where athlete_id = :source_athlete_id
union all
select 'athlete_training_sessions', count(*) from public.athlete_training_sessions where athlete_id = :source_athlete_id
union all
select 'athlete_scholarship_history', count(*) from public.athlete_scholarship_history where athlete_id = :source_athlete_id
union all
select 'program_athlete_notes', count(*) from public.program_athlete_notes where athlete_id = :source_athlete_id
union all
select 'program_athlete_scores', count(*) from public.program_athlete_scores where athlete_id = :source_athlete_id
union all
select 'athlete_inquiries', count(*) from public.athlete_inquiries where athlete_id = :source_athlete_id
union all
select 'athlete_invites', count(*) from public.athlete_invites where athlete_id = :source_athlete_id
union all
select 'recruiting_profiles', count(*) from public.recruiting_profiles where athlete_id = :source_athlete_id
union all
select 'transfer_portal_entries', count(*) from public.transfer_portal_entries where athlete_id = :source_athlete_id;
