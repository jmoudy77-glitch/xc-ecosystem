# Conflict Resolution

## Purpose
Provide a deterministic method for resolving conflicts between modules, specs, and implementation.

## Scope
Conflicts between any two of: governance, architecture, domain, module docs, AI docs, UI docs, implementation patterns.

## Authoritative statements
- Use precedence: Governance → Architecture → Domain Models → Operational Modules → AI/UI → Implementation.
- If a conflict is discovered:
  1) freeze the change,
  2) identify the violated invariant,
  3) update documentation first,
  4) then update code.
- Avoid “silent drift”: if behavior changes, documentation must change or the behavior is invalid.

## Sources
- `ai/ai_authority_charter.md`
- `ai/ai_presence_and_onboarding_doctrine.md`
- `ai/coach_facing_ai_philosophy.md`
- `architecture/billing-architecture.md`
- `architecture/ia_map.md`
- `architecture/performance-architecture.md`
- `development/Performance_Module_Actionable_Clarity_Executive_Summary.md`
- `function_area_notes/performance.md`
- `function_area_notes/platform_architecture_devops.md`
- `function_area_notes/program_health_absence_engine.md`
- `function_area_notes/recruiting.md`
- `security/rls-framework.md`
- `xc_ecosystem_conflict_resolution_doctrine.md`
- `xc_ecosystem_constitution.md`
- `xc_ecosystem_ui_architecture_doctrine.md`
