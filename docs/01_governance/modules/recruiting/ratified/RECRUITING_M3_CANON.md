# RECRUITING M3 — CANDIDATE IMPACT MODELING
## Canon Surface Ratification

---

### Article M3-I — Purpose & Scope

**M3 (Candidate Impact Modeling)** is the non-authoritative modeling layer within the Recruiting runtime that estimates how a specific recruit could plausibly mitigate a specific *recruitable absence*, without asserting reality or mutating Program Health state.

M3 exists to explain *why a recruit matters*, not to claim that an absence is resolved.

---

### Article M3-II — System Position

M3 is:
- Downstream of Program Health A2
- Downstream of Recruiting M1 (Stabilization Read)
- Downstream of Recruiting M2 (Pipeline Operations)
- Upstream of no authoritative runtime

M3 outputs may be read by other runtimes but may never mutate them.

---

### Article M3-III — Authority Boundaries

1. M3 does not resolve absences.
2. M3 does not recompute or alter A2.
3. M3 outputs are conditional and assumption-bound.
4. M3 is advisory only.

---

### Article M3-IV — Canonical Question

M3 answers one question only:

“If this recruit were rostered under reasonable assumptions, which recruitable absences would they plausibly pressure, and why?”

---

### Article M3-V — Canonical Output Primitive

The sole canonical output of M3 is the **Recruiting Candidate Impact**, materialized in:

`recruiting_candidate_impacts`

Each record is recruit-specific, capability-node-scoped, horizon-aware, constraint-aware, and rationale-bearing.

---

### Article M3-VI — Relationship to Program Health

Program Health may read M3 outputs as contextual advisory information only.

Program Health may never depend on M3 outputs for:
- Absence determination
- Severity calculation
- Horizon evaluation
- Canonical state emission

A2 remains sovereign.

---

### Article M3-VII — Gating Clause

No UI, automation, or cross-runtime dependency may treat M3 outputs as authoritative until all M3 canons (Surface, Input, Output) are ratified.

---

### Ratification

Recruiting M3 is hereby ratified as a canonical, non-authoritative impact modeling surface within the Recruiting runtime.
