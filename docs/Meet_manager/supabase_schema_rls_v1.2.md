# Meet Manager — Supabase Schema + RLS v1.2 (LOCKED)

**File:** `/docs/Meet_manager/supabase_schema_rls_v1.2.md`
**Status:** Canonical (v1.2)

---

## 0) Purpose

Defines the authoritative database schema surfaces and row-level security (RLS) rules required to support the Meet Manager v1.2 governance layer.

This document specifies **contracts**, not migrations. Physical migrations must conform exactly.

---

## 1) Core Tables

### 1.1 meets
- id (uuid, pk)
- host_program_id (uuid, fk → programs)
- meet_type (enum: XC | TF)
- lifecycle_state (enum)
- start_date
- location
- is_invitational (bool)
- created_at

RLS:
- SELECT: public (limited fields)
- INSERT/UPDATE/DELETE: host_program members only

---

### 1.2 meet_participants
- id (uuid, pk)
- meet_id (uuid, fk)
- program_id (uuid, fk)
- role (enum: HOST | ATTENDEE)
- join_state (enum)
- created_at

RLS:
- SELECT: program members if program_id matches
- INSERT: program members (guarded by join rules)
- UPDATE: host only

---

### 1.3 meet_rosters
- id (uuid, pk)
- meet_id (uuid, fk)
- program_id (uuid, fk)
- roster_state (enum)
- locked_at

RLS:
- SELECT: program members
- UPDATE: program members while editable
- UPDATE (lock): host or owning program per state machine

---

### 1.4 meet_entries
- id (uuid, pk)
- meet_id (uuid, fk)
- athlete_id (uuid, fk)
- event_id (uuid)
- entry_state (enum)

RLS:
- SELECT: program members
- INSERT/UPDATE: program members while entries editable
- DELETE: disallowed once locked

---

### 1.5 meet_events
- id (uuid, pk)
- meet_id (uuid, fk)
- event_type (XC | TRACK | FIELD)
- event_state (enum)
- scheduled_at

RLS:
- SELECT: public (limited)
- UPDATE: host only

---

### 1.6 meet_results
- id (uuid, pk)
- meet_id (uuid, fk)
- event_id (uuid, fk)
- athlete_id (uuid, fk)
- revision_number (int)
- result_payload (jsonb)
- publication_state (enum)
- created_at

RLS:
- SELECT:
  - public if publication_state in (PUBLISHED, FINAL, REVISED)
  - host always
- INSERT: host only
- UPDATE: disallowed (append-only)

---

### 1.7 ops_tokens
- id (uuid, pk)
- meet_id (uuid, fk)
- token_type (enum)
- token_hash (text)
- scope_event_id (uuid, nullable)
- expires_at
- revoked_at

RLS:
- SELECT: host only
- INSERT: host only
- UPDATE (revoke): host only

---

### 1.8 ops_token_audit
- id (uuid, pk)
- ops_token_id (uuid, fk)
- action
- event_id (uuid, nullable)
- created_at
- client_fingerprint

RLS:
- SELECT: host only
- INSERT: system only (service role)

---

## 2) Enum Sources

All enums must be sourced from:
- `state_machines_v1.2.md`
- `ops_token_lifecycle_v1.2.md`
- `results_pipeline_contracts_v1.2.md`

No inline enum divergence permitted.

---

## 3) Public Read Views

Required security-definer views:
- public_meet_overview
- public_live_events
- public_event_results

Views must:
- expose no athlete PII beyond name/team
- filter by publication_state

---

## 4) RLS Guard Principles

- All RLS predicates must be **role-based**, never client-trusted.
- Host authority derives from meet_participants.role = HOST.
- Program authority derives from program membership + meet association.
- Ops token access bypasses RLS via service role + explicit validation.

---

## 5) Service Role Boundaries

Service role permitted for:
- ops token validation
- results ingestion
- audit logging
- display feed materialization (future)

Service role must never be exposed client-side.

---

## 6) Versioning

This schema + RLS contract is **v1.2** and must remain consistent with:
- `canonical_spec_v1.2.md`
- `state_machines_v1.2.md`
- `routing_contracts_v1.2.md`
- `ops_token_lifecycle_v1.2.md`
- `results_pipeline_contracts_v1.2.md`
- `display_feed_contracts_v1.2.md`

Any schema deviation requires explicit governance promotion.
