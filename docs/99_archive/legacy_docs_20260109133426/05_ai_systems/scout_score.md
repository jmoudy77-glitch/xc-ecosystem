# Scout Score (AI System)
**Authority Level:** AI System (binding within charter)  
**Purpose:** Produce an interpretable recruiting evaluation score that helps coaches compare recruits and understand fit.

---

## 1. What it does
Scout Score is a **derived evaluation output** attached to the Recruiting module.
It summarizes recruit potential and fit using:
- performance history (facts)
- context (event group needs, program constraints)
- coach-authored evaluation inputs (facts)
- optional attributes (accolades, coachable metric inputs where allowed)

It must always provide rationale and uncertainty.

---

## 2. What it must not do
- It must not change pipeline state.
- It must not allocate scholarships.
- It must not hide drivers.
- It must not present itself as deterministic truth.

---

## 3. Inputs (Canonical)
Required / typical inputs (must be explicitly referenced for provenance):
- recruit identity link (athlete_id or external identifier)
- verified results history (preferred), or marked unverified
- event group(s) / discipline context
- program needs context (from roster gaps, if provided via contract)
- coach-authored qualitative evaluation fields
- Program Health constraint profile (context overlay only)

Optional inputs (program-configured):
- academic accolades / eligibility signals (if permitted)
- coachable metric input (if available and permitted)

---

## 4. Outputs (Canonical)
Scout Score must output:
- `score` (scaled number or category; platform-defined)
- `confidence` (per `confidence_semantics.md`)
- `drivers` (top factors increasing/decreasing score)
- `comparables` (optional: similar recruits / cohorts)
- `fit_notes` (coach-readable narrative)
- `data_gaps` (what is missing)

All persisted outputs must comply with `ai_output_record_contract.md`.

---

## 5. Coach Workflow Integration
Where it appears:
- recruit card (compact, not noisy)
- evaluation panel (expanded rationale)
- board sorting/filtering (score + confidence aware)
- cohort summaries (average by event group)

Interaction rules:
- one-click refresh (where permitted)
- coach can pin driver notes or add overrides (as human notes, not AI truth)
- AI suggestions never auto-advance pipeline states

---

## 6. Confidence Discipline
Low confidence is common for early prospects.
The system must:
- show “Low / Unknown” clearly
- highlight missing key inputs (results verification, sample size, recency)
- avoid strong language when confidence is low

---

## 7. Storage and Supersession
- Store outputs as derived analytics with versioning.
- Supersede old outputs; keep history for audit and longitudinal learning.

---

## 8. References
- `ai_authority_charter.md`
- `confidence_semantics.md`
- `ai_output_record_contract.md`
- `03_domain_models/recruiting_domain.md`
- `02_architecture/data_flow.md`
