/public/docs/05_ai_systems/ai_output_record_contract.md
# AI Output Record Contract
**Authority Level:** AI Contract (binding)  
**Purpose:** Define the minimum required fields for any persisted AI output to ensure auditability and reproducibility.

---

## 1. Applicability
Applies to any AI/derived output stored in the database, including:
- Scout Score
- Commit Probability
- Pipeline Projection
- Absence Engine signals
- any future AI-generated report artifact stored for a program

---

## 2. Required Fields (Canonical)
Every persisted AI output must include:

### 2.1 Scope
- `tenant_id` / `org_id`
- `program_id`
- optional: `team_id`, `season_id` (when relevant)
- optional: `athlete_id`, `recruit_id`, `recruit_board_item_id` (when entity-scoped)

### 2.2 Production metadata
- `produced_at`
- `producer_type` (system/job)
- `run_id` (job id or request id)
- `model_name`
- `model_version` (or `ruleset_version`)

### 2.3 Inputs
- `input_refs` (explicit references to facts used)
- `input_snapshot_id` (optional snapshot for reproducibility)
- `assumptions` (windowing, season mode, missing-data handling)

### 2.4 Outputs
- `output_payload` (structured output)
- `confidence_category` (High/Medium/Low/Unknown)
- optional: `confidence_score` (0–1)
- `explanation` (coach-readable rationale)
- `status` (active/superseded/invalidated)
- `superseded_by` (optional)

### 2.5 Governance / audit
- `created_by` (system actor)
- optional: `reviewed_by` / `coach_acknowledged_at` (if workflow requires)

---

## 3. Supersession Rule
New runs may supersede old outputs, but history should remain available.
Delete only when required by privacy/retention policy.

---

## 4. Interpretation Rule
Persisted AI outputs are **derived analytics**, not facts.
They must never overwrite the facts they are derived from.

---

## 5. References
- `01_governance/decision_protocol.md`
- `02_architecture/data_flow.md`
- `confidence_semantics.md`
