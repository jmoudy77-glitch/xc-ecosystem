# Canonical Sources and Precedence

## Canonical set
This codex is intended to be the **single source of truth** for XC‑Ecosystem product doctrine and implementation law.

The canonical set is:

- `01_governance/*` — constitution, decision protocol, conflict resolution, authority rules
- `02_architecture/*` — boundaries, ownership, causality, data authority
- `03_domain_models/*` — core entities, meanings, invariants, lifecycle semantics
- `04_operational_modules/*` — coach workflows, module responsibilities, downstream effects
- `05_ai_systems/*` — AI authority charter, model interfaces, confidence semantics, prohibitions
- `06_ui_system/*` — interaction contracts, navigation IA, layout rules, branding/system UI constraints
- `07_implementation/*` — enforceable patterns: RLS, server actions, API contracts, billing, developer handbook

## Precedence rules
When multiple documents address the same question:

1. **Governance overrides all.**  
   If a lower layer conflicts with governance, the lower layer must be revised.

2. **Architecture overrides domain and module behavior.**  
   Ownership and boundaries are not negotiable at the module level.

3. **Domain models define meaning; modules implement meaning.**  
   If a module diverges from domain meaning, the module is wrong (or the domain model needs to be updated intentionally).

4. **AI systems must obey governance, architecture, and domain meaning.**  
   AI may never invent new authority; it may only operate within defined jurisdiction.

5. **UI system is binding on all coach-facing surfaces.**  
   UI may not violate interaction contracts even if “easier to implement.”

6. **Implementation law is binding for engineers.**  
   Code patterns exist to enforce doctrine; if a pattern cannot support doctrine, the pattern must evolve.

## Non‑canonical / historical sources
- `99_archive/*` — historical notes, snapshots, superseded drafts, legacy docs. Useful as precedent, **not** controlling.
- Any file outside `/docs` is assumed **non‑authoritative** unless explicitly elevated into this codex.

## Conflict handling
If you find an inconsistency:
1. Identify the highest‑precedence controlling document.
2. Update or annotate the conflicting lower document.
3. If conflict is cross‑cutting, record the resolution path in `01_governance/conflict_resolution.md`.

## “Living doctrine” rule
The codex is not static. It is *governed*.  
All revisions must preserve:
- coach sovereignty and clarity
- modular boundaries and clean ownership
- causality transparency (“why / what happens if / reversible?”)
- AI jurisdiction constraints

