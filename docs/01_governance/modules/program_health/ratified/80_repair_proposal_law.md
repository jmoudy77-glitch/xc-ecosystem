# Program Health Repair Proposal Law (Ratified)

This law defines what Program Health may lawfully suggest as repairs and how suggestions convert into promotions.

Law anchors:
- genesis/module/program_health/ratified/10_active_law.md
- genesis/module/program_health/ratified/50_runtime_data_law.md
- genesis/module/program_health/ratified/60_registry_schemas.md
- genesis/module/program_health/ratified/70_read_contract.md
- genesis/module/program_health/ratified/75_inference_staging_law.md
- genesis/constitution/ratified/execution_integrity_constitution.md

---

## I. Repair Proposal Definition

A **Repair Proposal** is a NON-CANONICAL structured suggestion that may lead to a promotion.

Repair Proposals MUST:
- declare the target (capability node / absence / drift / ui surface)
- declare intended outcome in pressure semantics (void closure, drift stabilization, redundancy reduction, etc.)
- declare blast radius (files, tables, routes, components)
- declare required inputs (no assumptive execution)
- declare provenance (issuer, source_tables, timestamps)

Repair Proposals MUST NOT:
- imply autonomous execution
- mutate canonical state directly
- introduce doctrine-expanding features without amendment

---

## II. Repair Classes (lawful)

Only the following repair classes are lawful without amendment:

1) **Registry Repair**
   - adds missing capability nodes
   - adds missing canonical determinations
   - corrects taxonomy / provenance fields
   - adds required indexes or constraints

2) **Render Repair**
   - aligns UI with Active Law + UI v1 Constitution
   - fixes layout drift (no dashboard ecology)
   - restores visual causality / interpretive model

3) **Provenance Repair**
   - ensures canonical sources exist
   - improves proof payloads and truth view labeling

4) **Integrity Repair**
   - fixes RLS gaps
   - corrects read contract violations
   - removes admin bypass paths

Any other class requires constitutional amendment.

---

## III. Proposal Structure (binding)

A proposal stored in `public.program_health_inference_repairs.proposal` MUST conform to:

- repair_class (one of above)
- target_type (capability_node|absence|drift|ui)
- target_id (optional uuid)
- summary (short)
- rationale (pressure semantics)
- blast_radius:
  - repo_files: string[]
  - db_surfaces: string[]
  - api_routes: string[]
- required_inputs: string[]
- acceptance_tests: string[]
- promotion_plan:
  - promotion_id (optional placeholder)
  - operations (high-level ordered steps)

If any required field is missing, the proposal is invalid and must not be promoted.

---

## IV. Canonicalization Rule (binding)

A Repair Proposal becomes canonical only by:
- an atomic Codex promotion
- executed by the human
- recorded in the ledger

No other path exists.

---

## V. UI Presentation Rule (binding)

Repair proposals may be displayed only as:
- “Proposed Repair (Inference)”
- never as “Fix applied”
- never as a multi-step workflow leaving the instrument

Selection and dismissal must be reversible.

