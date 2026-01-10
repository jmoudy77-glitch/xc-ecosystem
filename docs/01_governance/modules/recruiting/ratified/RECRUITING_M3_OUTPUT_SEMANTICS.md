# RECRUITING M3 — OUTPUT SEMANTICS
## Canonical Meaning, Interpretation & Use

---

### Article M3-OS-I — Purpose

The M3 Output Semantics define the precise meaning of every field emitted by Recruiting M3 and the only valid ways those fields may be interpreted or consumed.

This canon exists to prevent authority leakage, false resolution inference, and misuse of modeled outputs as truth.

---

### Article M3-OS-II — Canonical Output Object

Each M3 emission is a **Recruiting Candidate Impact**, representing a conditional, non-authoritative contribution estimate.

The object is absence-adjacent, never absence-mutating.

---

### Article M3-OS-III — `impact_score` Semantics

**Definition**  
`impact_score` represents the relative modeled contribution magnitude a recruit could plausibly provide toward a specific capability node, under stated assumptions, at a given horizon.

**Invariants**
1. Relative only — comparable only within the same program, capability node, and horizon.
2. Non-sufficient — no value implies an absence is cleared or downgraded.
3. Directional, not absolute — higher means more pressure, not resolution.
4. Zero is meaningful — explicitly denotes no modeled contribution.

**Prohibited interpretations**
- “This fixes the absence.”
- “This recruit resolves this capability.”
- “This replaces Program Health severity.”

---

### Article M3-OS-IV — `cohort_tier` Semantics

**Definition**  
`cohort_tier` groups recruits into comparative impact bands for a given capability node and horizon.

**Canonical tier meanings**
- Tier 0: No meaningful impact
- Tier 1: Marginal / exploratory impact
- Tier 2: Meaningful but incomplete impact
- Tier 3: Strong alignment under assumptions

**Invariants**
- Not a ranking
- Not a probability
- Not exclusive

---

### Article M3-OS-V — `horizon` Semantics

`horizon` specifies when the modeled contribution could plausibly apply.

**Invariants**
- Horizon does not imply certainty
- Multiple horizons may coexist per recruit
- Absence at H0 does not preclude impact at H2/H3

---

### Article M3-OS-VI — `rationale` Semantics

`rationale` is a human-readable explanation of why the impact exists.

**Requirements**
- References structural alignment
- References plausibility evidence
- References temporal assumptions where applicable
- Avoids certainty language

If the rationale cannot be safely shown to a coach, the impact must not be emitted.

---

### Article M3-OS-VII — `inputs_hash` Semantics

`inputs_hash` uniquely fingerprints:
- Evidence identifiers
- Program context
- Model version

Any input change must produce a new hash.

---

### Article M3-OS-VIII — Absence Adjacency Rule

Each impact must correspond to an active recruitable absence via:
- Shared capability_node_id
- Shared horizon

No impact may exist without an underlying recruitable absence.

---

### Article M3-OS-IX — Negative & Null Semantics

Valid outcomes include:
- No record (no structural alignment)
- Zero score (alignment without plausibility)
- Horizon omission (temporal impossibility)

These outcomes are intentional and valid.

---

### Article M3-OS-X — Consumption Rules

M3 outputs may be used to:
- Explain surfaced recruit relevance
- Support recruiting-side advisory UI
- Power explicitly labeled hypothetical overlays

M3 outputs may not be used to:
- Mutate Program Health
- Clear or downgrade absences
- Represent future state as present truth
- Drive automation without human confirmation

---

### Article M3-OS-XI — Canon Supremacy

These semantics override UI convenience, ranking heuristics, and visualization shortcuts.

Any consumer violating these rules is constitutionally invalid.

---

### Ratification

The M3 Output Semantics are hereby ratified as canonical.
