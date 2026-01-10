# RECRUITING M3 — CAPABILITY NODE MAPPING CANON
## Recruiting ↔ Program Health Alignment Law

---

### Article M3-CNM-I — Purpose

The Capability Node Mapping Canon defines the **exclusive, authoritative rules** by which Recruiting concepts (event groups, athlete profiles) may be mapped to **Program Health capability nodes** for the purposes of Recruiting M3 impact modeling.

This canon exists to ensure:
- Structural integrity between Recruiting and Program Health
- Prevention of invented or implicit capability inference
- Deterministic, auditable mappings

---

### Article M3-CNM-II — Mapping Authority

1. **Program Health capability nodes are sovereign**
   - Recruiting may not redefine, subdivide, or reinterpret capability nodes.
   - All mappings terminate at Program Health–defined nodes.

2. **Recruiting does not create capability**
   - Recruiting may only *align* recruits to existing capability nodes.
   - No new capability node may be implied through recruiting logic.

---

### Article M3-CNM-III — Mapping Primitives

All mappings must be expressed using the following primitives only:

- `event_group` (Recruiting-defined)
- `capability_node_id` (Program Health–defined)
- `alignment_type`
  - `primary`
  - `secondary`
  - `null`
- `confidence_band`
  - `high`
  - `medium`
  - `low`
- `notes` (human-readable, non-authoritative)

No other primitives are permitted.

---

### Article M3-CNM-IV — Alignment Semantics

1. **Primary alignment**
   - Recruit’s event group is structurally central to the capability node.
   - Required for any non-zero M3 impact.

2. **Secondary alignment**
   - Recruit may plausibly contribute under constrained assumptions.
   - Secondary alignment may reduce impact magnitude but does not invalidate modeling.

3. **Null alignment**
   - No structural relationship exists.
   - Null alignment **forbids** impact record emission.

Alignment type is a **gate**, not a score.

---

### Article M3-CNM-V — Constraint-Type Awareness

Capability node mappings must explicitly acknowledge the underlying **constraint type**:

- Coverage
- Redundancy
- Authority
- Certification

Canonical rules:
- Coverage and redundancy mappings may rely on event group alignment.
- Authority and certification mappings require explicit evidence and may never be inferred from performance alone.
- Absence of valid authority/certification evidence results in null alignment.

---

### Article M3-CNM-VI — Program Variance

Mappings may be **program-relative**, but only within bounded rules:

- A program may:
  - Elevate or suppress secondary alignment
  - Adjust confidence bands
- A program may not:
  - Convert null alignment into primary alignment
  - Override constraint-type incompatibility

---

### Article M3-CNM-VII — Prohibited Mapping Behavior

The following are explicitly forbidden:

1. Inferring capability nodes directly from performance metrics
2. Treating event groups as synonymous with capability nodes
3. Mapping a recruit to “fix” or “solve” a node
4. Auto-mapping authority or certification capabilities
5. Silent fallback mappings when alignment is unclear

Violation of this article invalidates all derived M3 outputs.

---

### Article M3-CNM-VIII — Auditability & Change Control

- All mappings must be:
  - Documented
  - Versioned
  - Reviewable
- Any change to mapping rules requires:
  - A new canon promotion
  - Explicit ledger entry

---

### Article M3-CNM-IX — Relationship to M3 Activation Gate

This canon satisfies **Precondition #1** of the M3 Activation Gate.

No M3 activation promotion may proceed without this canon being ratified and referenced.

---

### Ratification

The Recruiting ↔ Program Health Capability Node Mapping Canon is hereby ratified as authoritative.

All Recruiting M3 alignment logic must conform strictly to this canon.
