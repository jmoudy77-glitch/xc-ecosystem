# RECRUITING M3 — INPUT CANON
## Canonical Input Authority & Constraints

---

### Article M3-IC-I — Purpose

The M3 Input Canon defines the exclusive evidence streams permitted in Recruiting M3 Candidate Impact Modeling and the rules governing their use.

Its purpose is to ensure M3 outputs remain explainable, program-relative, non-authoritative, and incapable of mutating Program Health truth.

---

### Article M3-IC-II — Input Classes

All M3 inputs fall into four bounded classes:

1. Structural Alignment Inputs  
2. Capability Plausibility Inputs  
3. Temporal & Availability Inputs  
4. Program-Relative Context Inputs  

No other input classes are permitted.

---

### Article M3-IC-III — Structural Alignment Inputs (Required)

Structural Alignment Inputs determine whether a recruit is eligible to be considered relevant to a recruitable absence.

Permitted inputs:
- Recruit event group classification
- Recruit primary / secondary event profile
- Program capability node → event group mappings
- Absence capability_node_id
- Absence constraint type (coverage, redundancy, authority, certification)

Canonical rule:
If a recruit does not structurally align to the capability node underlying an absence, no impact record may be generated.

Structural alignment is a gate, not a score.

---

### Article M3-IC-IV — Capability Plausibility Inputs

Capability Plausibility Inputs estimate how plausibly a recruit could contribute to a capability if rostered, without asserting sufficiency.

Permitted inputs:
- Verified performance data
- Performance trajectory indicators
- Evaluation artifacts (coach notes, ratings)
- Comparable cohort benchmarks
- Historical role patterns where available

Constraints:
- Performance may not be treated as direct capability satisfaction
- No single metric may dominate impact scoring
- All plausibility contributions must be explainable in natural language

Plausibility influences impact magnitude, not existence.

---

### Article M3-IC-V — Temporal & Availability Inputs

Temporal inputs shape when a recruit’s modeled contribution could plausibly apply.

Permitted inputs:
- Graduation year
- Enrollment timeline
- Redshirt likelihood when explicitly known
- Injury recovery indicators (bounded, non-diagnostic)
- Eligibility confidence tiers

Temporal inputs may:
- Shift horizon weighting
- Reduce near-term impact confidence
- Nullify impact at certain horizons

Temporal inputs may not:
- Advance impact earlier than structurally possible
- Assume immediate availability without evidence

---

### Article M3-IC-VI — Program-Relative Context Inputs

Program context determines how the same recruit is interpreted across programs.

Permitted inputs:
- Existing roster composition (counts only)
- Program depth norms
- Program capability saturation
- Program-defined recruiting priorities

Program context may scale impact but may not override:
- Structural misalignment
- Constraint incompatibility
- Temporal impossibility

---

### Article M3-IC-VII — Prohibited Inputs

The following inputs are explicitly forbidden:

1. Program Health outcomes (A2 severity, resolution state)
2. Recruiting intent (slot assignment, offer status, commitment likelihood)
3. Speculative future states or assumed development
4. Implicit authority or certification inference without evidence
5. Unattributed or non-explainable AI inference

Violation of this article invalidates the impact record.

---

### Article M3-IC-VIII — Rationale & Provenance

Every Recruiting Candidate Impact must include:
- A human-readable rationale
- An inputs_hash derived from input identifiers, program context, and model version

If the rationale cannot be shown to a coach without misinterpretation risk, the impact must not be emitted.

---

### Article M3-IC-IX — Negative & Null Impact Canon

M3 explicitly recognizes non-impact as a valid outcome:
- No structural alignment → no record
- Structural alignment with zero plausibility → zero impact
- Temporal exclusion → horizon-limited impact

---

### Article M3-IC-X — Canon Supremacy

These input rules override heuristic convenience, UI shortcuts, and downstream consumer expectations.

Any M3 computation must conform strictly to this canon.

---

### Ratification

The M3 Input Canon is hereby ratified as authoritative for all Recruiting M3 impact modeling.
