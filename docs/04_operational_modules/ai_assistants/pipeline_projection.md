# Pipeline Projection (AI System)
**Authority Level:** AI System (binding within charter)  
**Purpose:** Forecast pipeline-to-roster outcomes and highlight cohort gaps (by event group/class year) with explainable uncertainty.

---

## 1. What it does
Pipeline Projection is a planning forecast that helps a coach answer:
- If our current pipeline holds, what roster do we actually end up with?
- Where are we thin (event groups, class years, depth)?
- What recruiting work is required to avoid holes next season?

It is a derived planning tool; it must never overwrite roster truth.

---

## 2. Inputs (Canonical)
- current pipeline inventory (counts by state and segment)
- commit probability outputs (where available; with provenance)
- roster targets and constraints (scenario inputs from roster domain)
- program capacity constraints (scholarships/budget remaining)
- historical conversion rates (within same program/tenant only)
- time windows (season and recruiting cycle)

---

## 3. Outputs (Canonical)
- projected commits by cohort segment (event group/class year/team)
- uncertainty bands (confidence semantics required)
- gap analysis: “needed vs projected”
- recommended focus areas (bounded suggestions)
- scenario comparison artifacts (non-authoritative until confirmed)

Persist outputs via `ai_output_record_contract.md`.

---

## 4. Coach Workflow Integration
Surfaces:
- recruiting planning dashboard
- roster builder “gap” view
- season planning summaries

Interaction rules:
- “what-if” toggles must remain in scenario mode by default
- allow coach to adjust assumptions (conversion rates, budget, priorities) explicitly
- show provenance: what pipeline states and probabilities the projection used

---

## 5. Failure Modes
- If commit probability is missing for many recruits, projection must degrade gracefully and state limitations.
- If roster targets are missing, projection should still show pipeline inventory and “unconstrained expected outcome” as a separate view.

---

## 6. References
- `ai_authority_charter.md`
- `confidence_semantics.md`
- `ai_output_record_contract.md`
- `03_domain_models/roster_domain.md`
- `03_domain_models/recruiting_domain.md`
- `02_architecture/data_flow.md`
