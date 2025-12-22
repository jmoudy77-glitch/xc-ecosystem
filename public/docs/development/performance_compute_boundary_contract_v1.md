# Performance Module — Compute Boundary Contract (v1)

Status: Locked  
Effective Date: 2025-12-22  
Applies To: Performance Module v1 (Intel-Prime)  

## Purpose
This contract defines the system boundary for all deterministic computation in the Performance Module: **what gets computed, when it is allowed to change, how it is versioned, and how it is audited**.

It is governance, not implementation detail. If code “works” but violates this contract, the contract prevails.

---

## Core Non‑Negotiables

1. **Math-first, deterministic**
   - Same inputs → same outputs.
   - No black-box inference in primes, rollups, or signals.

2. **AI is read-only**
   - AI may never write primes, rollups, or signals.
   - AI reads deterministic outputs and explains them.

3. **No silent recompute**
   - Outputs persist.
   - Changes only occur via explicit recompute triggers.

4. **Explainable and reconstructable**
   - Every computed artifact must be explainable from:
     - input data
     - lens definitions
     - ruleset version/spec
     - stored evidence/fingerprints

---

## Ownership Model

### System-owned (deterministic infrastructure)
- `performance_primes`
- `athlete_performance_rollups`
- `team_performance_rollups`
- `performance_signals`
- `performance_prime_rulesets` and `performance_signal_rulesets`
- `performance_lenses` (definitions are system contracts)

### Human-owned (raw intel collection)
- `athlete_performances` (ground truth collection)
- Corrections/voids must be recorded as audit events

### AI-owned (ephemeral, non-authoritative)
- Brief narratives, explanations, scenario discussion
- No persistence to truth tables

---

## Canonical Compute Pipeline

### Stage 0 — Input Selection (Raw Truth)
Source: `athlete_performances`

Baseline eligibility (lens may further narrow):
- `performance_type in ('verified_meet','self_reported')` unless lens allows otherwise
- Mark exists: `mark_seconds is not null OR mark_value is not null`

### Stage 1 — Prime Computation (Layer 2)
Target: `performance_primes`

- One row per `(performance_id, ruleset_id)`
- Produces:
  - canonical event mapping
  - canonical mark
  - deterministic `normalized_index`
  - `inputs_fingerprint`

### Stage 2 — Rollups (Layer 2)
Targets:
- `athlete_performance_rollups` (one per athlete × lens × ruleset)
- `team_performance_rollups` (one per subject × lens × ruleset)

Rollups read **primes** (and lens/ruleset), not AI and not “opinion.”

### Stage 3 — Signals (Layer 3)
Target: `performance_signals`

Signals are attention flags, not conclusions. They:
- read primes/rollups
- store deterministic evidence
- remain calm and bounded (severity 1–5)

---

## Compute Contracts

### A. Prime Contract (per raw performance)

**Inputs (minimum):**
- `athlete_performances.{id, athlete_id, event_code, mark_seconds, mark_value, performance_date, performance_type, timing_method}`
- normalization sources (e.g., `event_definitions`) as required
- active `performance_prime_rulesets`

**Output:**
- UPSERT into `performance_primes` keyed by `(ruleset_id, performance_id)`

**Invalidation triggers:**
Recompute prime if:
- any fingerprinted raw field changes, or
- event normalization mapping changes, or
- ruleset spec changes / new ruleset version becomes active.

---

### B. Athlete Rollup Contract (per athlete + lens)

**Inputs:**
- primes for athlete filtered by lens definition
- prime ruleset spec
- lens definition

**Outputs (minimum):**
- `current_index`
- `trend_slope`
- `trend_confidence` (bounded 0..1)
- `volatility_index`
- `inputs_fingerprint`

**Output behavior:**
- UPSERT keyed by `(ruleset_id, athlete_id, lens_code)`

**Invalidation triggers:**
Recompute rollup if:
- any included prime changes, or
- lens definition changes, or
- ruleset changes.

---

### C. Team Rollup Contract (team_season + team_window)

**Inputs:**
- deterministic membership set:
  - `team_season`: `team_roster` for `team_season_id`
  - `team_window`: deterministic multi-season selection policy for the team
- primes (recommended v1) or athlete rollups (optional later)
- lens + ruleset

**Outputs (minimum):**
- `scoring_capacity_json` (system-owned shape)
- `coverage_depth_json` (system-owned shape)
- optional indices:
  - `team_trajectory_index` (nullable v1)
  - `team_volatility_index` (nullable v1)
- `inputs_fingerprint`

**Output behavior:**
- UPSERT keyed by `(ruleset_id, subject_type, subject_id, lens_code)`
- Must satisfy subject integrity constraint:
  - `team_season`: `subject_id = team_season_id`
  - `team_window`: `subject_id = team_id`

**Invalidation triggers:**
Recompute team rollup if:
- any included prime changes, or
- roster membership changes, or
- lens/ruleset changes, or
- window selection boundaries change.

---

### D. Signals Contract (attention flags)

**Inputs:**
- rollups + primes as needed
- signal ruleset spec
- lens definition

**Outputs:**
- signal rows with:
  - `signal_code`
  - `severity` (1–5 calm)
  - deterministic `evidence_json`

**v1 idempotency policy (locked):**
- “Replace latest per subject/lens/signal/ruleset”
- Key: `(ruleset_id, subject_type, subject_id, lens_code, signal_code)`
- Behavior: UPSERT replacing evidence; refresh timestamp.

---

## Fingerprints and Recompute Triggers

### Fingerprint policy
Each computed artifact stores `inputs_fingerprint` as a deterministic hash (recommended: SHA-256) over:
- ruleset code + spec version marker
- lens_code + lens definition JSON (for rollups/signals)
- ordered list of included source IDs and key fields (for aggregates)

### Trigger taxonomy (only allowed reasons to recompute)
1. Raw data event: insert/correct/void in performance records
2. Roster membership event: changes to `team_roster`
3. Ruleset event: ruleset spec updated / active ruleset changed
4. Lens event: lens definition updated (rare; system-owned)
5. Season boundary event: window selection changes

---

## Execution Model

### Job boundaries (recommended)
1. Compute primes (scope: athlete or program)
2. Compute athlete rollups (scope: athlete or program; per lens)
3. Compute team rollups (scope: team season or program; per lens)
4. Compute signals (scope: same as rollups; per lens)

### Scheduling model
- Event-driven where possible
- Plus periodic reconciliation runs (daily) to catch missed events
- Jobs must be safe to run repeatedly (idempotent UPSERT)

### Failure behavior
Partial truth is acceptable and preferred over fabricated truth:
- primes may exist without rollups
- rollups may exist without signals
UI must remain calm when data is sparse or incomplete.

---

## Out of Scope (by contract)
- Any AI-persisted “interpretation”
- Any black-box scoring written into truth tables
- Any UI-driven “mode” that changes math behavior without versioned lens/ruleset changes

---

## Change Policy
- Any change to math or thresholds requires:
  - new versioned ruleset (preferred), or
  - explicit ruleset spec update with clear version bump
- Lens behavior is system-owned; coaches may select defaults, not redefine math.
