# AI Authority Charter

## Purpose
Define what AI is allowed to do in XC‑Ecosystem and what it is forbidden from doing.

## Scope
Applies to all AI features (Scout Score, Commit Probability, Pipeline Projection, Absence Engine, reporting avatars, etc.).

## Authoritative statements
- AI may **advise, summarize, and forecast**, but may not silently change source‑of‑truth data.
- AI outputs must be:
  - attributable to inputs,
  - versioned (model/ruleset),
  - auditable (timestamps, confidence semantics).
- AI must respect module boundaries: cross‑module inference is allowed only when explicitly declared.
- When uncertainty is high, AI must surface uncertainty rather than fabricate precision.

## System interactions
- Allowed inputs/outputs are specified per AI module file.
- Storage and policy enforcement are defined in `07_implementation/*`.

## Sources
- `00-index.md`
- `2025-12-18_XC-Ecosystem_Design_Protocol.md`
- `ai/academic-risk.md`
- `ai/ai-data-sources.md`
- `ai/ai_authority_charter.md`
- `ai/ai_presence_and_onboarding_doctrine.md`
- `ai/coach_facing_ai_philosophy.md`
- `ai/commit-probability.md`
- `ai/event-fit-score.md`
- `ai/overview.md`
- `ai/pipeline-projection.md`
- `ai/scout-score.md`
- `architecture/ai-architecture.md`
- `architecture/billing-architecture.md`
- `architecture/data-flow.md`
- `architecture/domain-architecture.md`
- `architecture/event-model.md`
- `architecture/ia_map.md`
- `architecture/performance-architecture.md`
- `architecture/system-architecture.md`
- `branding/ecosport-universe.md`
- `development/2025-12-24-snapshot.md`
- `development/Performance_Module_Actionable_Clarity_Executive_Summary.md`
- `development/Performance_Module_Development_Design_Contract.md`
- `development/dev-seed-core-training.md`
- `development/developer-handbook/02.tech-stack-overview.md`
- `development/developer-handbook/09.ai-development.md`
- `development/developer-handbook/14.glossary.md`
- `development/handbook/api-design.md`
- `development/handbook/code-conventions.md`
- `development/handbook/deployment-workflow.md`
- `development/performance_compute_boundary_contract_v1.md`
- `features/athlete-profile.md`
- `features/inquiries.md`
- `features/onboarding-flows.md`
- `features/recruiting-pipeline.md`
- `features/transfer-portal.md`
- `function_area_notes/ai_analytics_modules.md`
- `function_area_notes/meet_management_data_ingestion.md`
- `function_area_notes/meta_session_logs.md`
- `function_area_notes/partnerships_expansion.md`
- `function_area_notes/performance.md`
- `function_area_notes/platform_architecture_devops.md`
- `function_area_notes/practice_scheduler_planner.md`
- `function_area_notes/program_health_absence_engine.md`
- `function_area_notes/recruiting.md`
- `function_area_notes/roster_scholarships.md`
- `function_area_notes/ui_ux_interaction_philosophy.md`
- `index.md`
- `master-architecture.md`
- `planning/milestones.md`
- `planning/project-scope.md`
- `planning/requirements.md`
- `product/competitive-landscape.md`
- `product/personas.md`
- `product/positioning.md`
- `product/pricing-model.md`
- `product/roadmap.md`
- `results/overview.md`
- `results/results-lifecycle.md`
- `results/verification-and-statuses.md`
- `schema/domains/athletes.md`
- `schema/domains/billing-subscriptions.md`
- `schema/domains/identity-users.md`
- `schema/domains/programs-teams.md`
- `schema/domains/recruiting.md`
- `schema/domains/results.md`
- `schema/domains/seasons-rosters.md`
- `schema/domains/training.md`
- `schema/schema-history/2025-12-01-with-teams-and-seasons.md`
- `schema/schema-latest.md`
- `security/data-ownership.md`
- `security/privacy-model.md`
- `security/rls-framework.md`
- `team-ops/overview.md`
- `team-ops/practice-scheduler.md`
- `team-ops/stats-manager.md`
- `team-ops/workouts-and-training-events.md`
- `theme/token-contract.md`
- `theme/ui-intuition-checklist.md`
- `training-module-decisions.md`
- `ui/workflows/meet-manager.md`
- `ui/workflows/practice-scheduler.md`
- `ui/workflows/recruiting-board.md`
- `ui/workflows/roster-builder.md`
- `ui/workflows/team-management.md`
- `xc_ecosystem_conflict_resolution_doctrine.md`
- `xc_ecosystem_constitution.md`
- `xc_ecosystem_ui_architecture_doctrine.md`
