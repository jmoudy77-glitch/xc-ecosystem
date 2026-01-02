# Program Health Promotion Proposal Channel (Ratified)

This law defines the only lawful channel by which Repair Proposals become Codex promotions.

Law anchors:
- genesis/module/program_health/ratified/80_repair_proposal_law.md
- genesis/constitution/ratified/execution_integrity_constitution.md

---

## I. Channel Definition

The Promotion Proposal Channel is a NON-CANONICAL staging surface that prepares a Repair Proposal for lawful execution.

Canonicalization occurs ONLY when:
- A Codex promotion is emitted
- The human executes it
- The ledger records it

---

## II. Promotion Envelope (binding)

Each row in public.program_health_promotion_proposals MUST declare:

- promotion_id (YYYYMMDDNNNN placeholder or final)
- domain (program_health)
- primitive (repair class)
- blast radius:
  - blast_repo_files
  - blast_db_surfaces
  - blast_api_routes
- operations (ordered, high-level executable plan)
- provenance (issuer, source_tables, timestamps)

If any field is missing, the proposal is invalid and must not be executed.

---

## III. Status Transitions (binding)

Valid transitions:
- draft → ready → submitted → applied
- draft → rejected
- ready → rejected
- submitted → rejected

No other transitions are lawful.

---

## IV. UI Presentation Rule (binding)

Promotion proposals must be displayed as:
- “Proposed Promotion (Inference)”
- Never as “Executed”
- Never as an automated workflow

Selection, editing, and dismissal must be reversible.

---

## V. Execution Rule (binding)

No promotion may be executed unless:
- Its row is in status = 'submitted'
- All blast radius fields are declared
- It conforms to Repair Proposal Law

