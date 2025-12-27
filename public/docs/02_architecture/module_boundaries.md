# Module Boundaries

## Purpose
Prevent cross‑contamination between modules and enforce upstream/downstream relationships.

## Scope
Recruiting, Roster & Scholarships, Performance, Program Health, Practice Scheduler, Meet Management, AI systems.

## Authoritative statements
- **Program Health → Recruiting → Roster Builder** is upstream/downstream; roster building is downstream of recruiting, recruiting is downstream of program health.
- Performance is in‑season execution; Program Health is structural diagnosis; neither should “contaminate” the other without explicit boundary rules.
- AI may observe across modules but may not blur ownership: each module’s source‑of‑truth data is authoritative within its boundary.

## System interactions
- Domain invariants are defined in `03_domain_models/*`.
- AI systems must declare allowed inputs per `05_ai_systems/ai_authority_charter.md`.

## Sources
- `00-index.md`
- `2025-12-18_XC-Ecosystem_Design_Protocol.md`
- `ai/ai_authority_charter.md`
- `ai/coach_facing_ai_philosophy.md`
- `ai/pipeline-projection.md`
- `architecture/ai-architecture.md`
- `architecture/data-flow.md`
- `architecture/domain-architecture.md`
- `architecture/event-model.md`
- `architecture/ia_map.md`
- `architecture/navigation-architecture.md`
- `architecture/performance-architecture.md`
- `architecture/system-architecture.md`
- `branding/ecosport-universe.md`
- `development/2025-12-24-snapshot.md`
- `development/Performance_Module_Actionable_Clarity_Executive_Summary.md`
- `development/Performance_Module_Development_Design_Contract.md`
- `development/dev-seed-core-training.md`
- `development/handbook/git-standards.md`
- `development/handbook/naming-conventions.md`
- `development/performance_compute_boundary_contract_v1.md`
- `features/athlete-profile.md`
- `features/inquiries-and-invites.md`
- `features/onboarding-flows.md`
- `features/recruiting-pipeline.md`
- `features/roster-management.md`
- `features/roster-system.md`
- `features/team-season-management.md`
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
- `master-architecture.md`
- `planning/milestones.md`
- `planning/project-scope.md`
- `planning/requirements.md`
- `product/competitive-landscape.md`
- `product/personas.md`
- `product/positioning.md`
- `product/pricing-model.md`
- `product/roadmap.md`
- `results/meet-structure.md`
- `results/overview.md`
- `results/verification-and-statuses.md`
- `schema/domains/athletes.md`
- `schema/domains/recruiting.md`
- `schema/domains/results.md`
- `schema/domains/seasons-rosters.md`
- `schema/domains/training.md`
- `schema/schema-latest.md`
- `security/data-ownership.md`
- `security/permissions-matrix.md`
- `security/privacy-model.md`
- `security/rls-framework.md`
- `team-ops/evaluations.md`
- `training-module-decisions.md`
- `ui/components.md`
- `ui/page-blueprints.md`
- `ui/workflows/meet-manager.md`
- `ui/workflows/practice-scheduler.md`
- `ui/workflows/recruiting-board.md`
- `ui/workflows/roster-builder.md`
- `ui/workflows/team-management.md`
- `xc_ecosystem_constitution.md`
- `xc_ecosystem_ui_architecture_doctrine.md`
