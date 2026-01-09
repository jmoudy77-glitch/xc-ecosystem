# Meet Manager — Results Pipeline Contracts v1.2 (LOCKED)

**File:** `/docs/Meet_manager/results_pipeline_contracts_v1.2.md`
**Status:** Canonical (v1.2)

---

## 0) Purpose

Defines the authoritative pipeline for ingesting, validating, revising, and publishing results across XC and Track & Field, including public live results and downstream display feeds.

---

## 1) Core Principles

1. **Single Source of Truth**
   - All results mutations originate from host-controlled ops actions.
2. **Append-Only Revisions**
   - Corrections never overwrite; they supersede.
3. **Event-Scoped Finalization**
   - Results finalize per event, not per meet.
4. **Deterministic Publication**
   - Public visibility follows explicit state transitions only.
5. **Auditability**
   - Every mutation is attributable and timestamped.

---

## 2) Pipeline Stages

| Stage | Description |
|---|---|
| INGEST | Raw timing/scoring captured |
| NORMALIZE | Convert to canonical units/structures |
| VALIDATE | Rules + integrity checks |
| PROVISIONAL | Visible to host, not public |
| PUBLISHED | Public live visibility |
| FINAL | Event locked; revisions require reopen |
| REVISED | Superseding correction published |

---

## 3) Ingest Sources

### 3.1 Running Events
- Timer console (OPS_TIMER)
- Captures:
  - gun/start time
  - splits
  - finish times
  - placements (derived)

### 3.2 Field Events
- QR scoring (OPS_FIELD_SCORING)
- Captures:
  - attempts
  - measurements
  - fouls
  - best mark (derived)

---

## 4) Validation Rules

- Athlete must be checked-in or explicitly allowed by meet rules
- Entry must exist and be unlocked at ingest time
- Event state must permit ingest
- Measurement units must match event spec
- Duplicate submissions are idempotent by (event_id, athlete_id, attempt_index)

Failures hard-reject and log.

---

## 5) Publication Rules

- **PROVISIONAL**
  - Host-visible only
- **PUBLISHED**
  - Public live routes consume
  - Display feeds may subscribe
- **FINAL**
  - Event closed
  - No further ingest allowed

---

## 6) Revision Lifecycle

1. Host reopens event (guarded)
2. New revision appended
3. Prior revision marked SUPERSEDED
4. Public view auto-updates with revision flag

Revisions are immutable once published.

---

## 7) Aggregation

### 7.1 XC
- Team scores derived from finalized individual placements
- Tie-breaking per meet ruleset

### 7.2 Track & Field
- Team points derived per event scoring table
- Aggregates update on event FINAL or REVISION

---

## 8) Public Consumption

Public routes consume only:
- PUBLISHED
- FINAL
- REVISED (latest only)

PROVISIONAL is never exposed publicly.

---

## 9) Failure Handling

- Partial ingest allowed per athlete
- Event-level failures do not cascade
- Host UI surfaces exact failure reason

---

## 10) Versioning

This results pipeline contract is **v1.2** and must remain consistent with:
- `canonical_spec_v1.2.md`
- `state_machines_v1.2.md`
- `routing_contracts_v1.2.md`
- `ops_token_lifecycle_v1.2.md`

Any change requires explicit governance promotion.
