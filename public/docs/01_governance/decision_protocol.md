# Decision Protocol

## Purpose
Define how architectural and product decisions are proposed, evaluated, and locked.

## Scope
Applies to: data ownership, cross‑module dependencies, AI authority, UI interaction contracts, billing/plan semantics, and schema/RLS changes.

## Authoritative statements
- Decisions affecting boundaries must be documented in `/docs` before code is considered final.
- Prefer the approach that will **not require refactoring later** (bias toward durable system design).
- When ambiguity exists, resolve it by:
  1) stating the invariant,
  2) identifying upstream/downstream responsibilities,
  3) choosing the simplest rule that preserves long‑term scalability.
- Once a spec is marked “locked”, changes require a written rationale and an updated spec.

## System interactions
- Conflicts are adjudicated using `conflict_resolution.md`.
- Locked specs must be referenced by downstream modules (e.g., Recruiting → Roster Builder).

## Sources
- `00-index.md`
- `2025-12-18_XC-Ecosystem_Design_Protocol.md`
- `ai/ai_authority_charter.md`
- `ai/ai_presence_and_onboarding_doctrine.md`
- `ai/coach_facing_ai_philosophy.md`
- `architecture/ia_map.md`
- `architecture/performance-architecture.md`
- `branding/ecosport-universe.md`
- `development/Performance_Module_Actionable_Clarity_Executive_Summary.md`
- `development/Performance_Module_Development_Design_Contract.md`
- `development/decision-log.md`
- `development/developer-handbook.md`
- `development/developer-handbook/01.introduction.md`
- `development/developer-handbook/02.tech-stack-overview.md`
- `development/developer-handbook/03.project-structure.md`
- `development/developer-handbook/04.environment-setup.md`
- `development/developer-handbook/05.environment-variables.md`
- `development/developer-handbook/06.database-workflows.md`
- `development/developer-handbook/07.api-guidelines.md`
- `development/developer-handbook/08.billing-and-subscriptions.md`
- `development/developer-handbook/09.ai-development.md`
- `development/developer-handbook/10.ui-ux-guidelines.md`
- `development/developer-handbook/11.testing-and-quality.md`
- `development/developer-handbook/12.deployment-guide.md`
- `development/developer-handbook/13.troubleshooting.md`
- `development/developer-handbook/14.glossary.md`
- `development/developer-handbook/index.md`
- `development/handbook/api-design.md`
- `development/handbook/code-conventions.md`
- `development/handbook/component-architecture.md`
- `development/handbook/deployment-workflow.md`
- `development/handbook/file-structure.md`
- `development/handbook/git-standards.md`
- `development/handbook/naming-conventions.md`
- `development/handbook/supabase-integration.md`
- `development/handbook/testing-strategy.md`
- `function_area_notes/ai_analytics_modules.md`
- `function_area_notes/meta_session_logs.md`
- `function_area_notes/performance.md`
- `function_area_notes/platform_architecture_devops.md`
- `function_area_notes/program_health_absence_engine.md`
- `function_area_notes/recruiting.md`
- `function_area_notes/roster_scholarships.md`
- `function_area_notes/ui_ux_interaction_philosophy.md`
- `master-architecture.md`
- `product/competitive-landscape.md`
- `product/positioning.md`
- `team-ops/evaluations.md`
- `training-module-decisions.md`
- `ui/workflows/team-management.md`
- `xc_ecosystem_conflict_resolution_doctrine.md`
- `xc_ecosystem_constitution.md`
- `xc_ecosystem_ui_architecture_doctrine.md`
