# A1 Absence Engine — Canonical Constitution

**Canonical Constitution Copy**
- **Source:** `public/docs/05_ai_systems/absence_engine.md`
- **Copy date:** 2025-12-28
- **Policy:** Downstream implementations must not overwrite this document.

---

# Absence Engine / A1 (AI-Adjacent Analytical System)
**Authority Level:** AI System (binding within charter)  
**Purpose:** Detect attendance/engagement anomalies and patterns that threaten continuity, and surface them as explainable signals in Program Health.

---

## 1. What it does
Absence Engine (A1) is a derived analytics system that:
- detects abnormal absence patterns
- flags trend shifts (improving/worsening engagement)
- distinguishes between isolated misses and systemic signals
- supports coach-labeled reasons and context

A1 is “AI-adjacent” because it may be rules-driven or model-driven, but it must obey the AI charter when behaving as decision support.

---

## 2. Inputs (Canonical)
- attendance outcomes (facts) from Performance/Practice workflows
- availability states (facts) where applicable
- season mode context (optional)
- coach-labeled reasons/categories (facts)
- constraint profile context (optional: travel/facility disruptions)

---

## 3. Outputs (Canonical)
- anomaly signals (what looks abnormal, and why)
- trend summaries (direction and magnitude)
- segmentation (which cohort/group is affected)
- confidence (per `confidence_semantics.md`)
- recommended follow-up actions (bounded, coach-controlled)
- data gaps (missing reasons, missing attendance capture)

Persisted outputs must comply with `ai_output_record_contract.md`.

---

## 4. Coach Workflow Integration
Surfaces:
- Program Health dashboard (top risks)
- attendance/engagement drill-down
- optional overlay on Performance surfaces (context only)

Interaction rules:
- never nag; present as signal with clear provenance
- allow coach to label reasons quickly (improves interpretability)
- allow dismiss/snooze with rationale (reversible; stored)

---

## 5. What it must not do
- Must not change attendance facts.
- Must not assign blame; it surfaces signals.
- Must not infer sensitive personal reasons without explicit coach entry.

---

## 6. References
- `ai_authority_charter.md`
- `confidence_semantics.md`
- `ai_output_record_contract.md`
- `03_domain_models/program_health_domain.md`
- `02_architecture/data_flow.md`
