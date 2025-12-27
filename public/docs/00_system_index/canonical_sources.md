# Canonical Sources and Precedence

## Canonical set
The following documents are authoritative for reasoning and implementation:

- `01_governance/*` (highest precedence)
- `02_architecture/*`
- `03_domain_models/*`
- `04_operational_modules/*`
- `05_ai_systems/*`
- `06_ui_system/*`
- `07_implementation/*`

## Non‑canonical set
- `99_archive/*` — historical notes, snapshots, superseded drafts

## Conflict resolution
If there is a conflict:
1. Identify which docs are in conflict.
2. Apply precedence order (Governance → Architecture → Domain → Module → AI/UI → Implementation).
3. Update the lower‑precedence doc (or promote a rule to Governance) to remove ambiguity.
4. Only then update code.

## Update discipline
When adding new documentation, each file must include:
- **Purpose**
- **Scope**
- **Authoritative statements** (hard constraints)
- **System interactions**
- **Open questions** (if any)

This structure is required to keep retrieval stable for ChatGPT.
