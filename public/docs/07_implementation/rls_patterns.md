# RLS Patterns (Supabase)

## Purpose
Standardize RLS strategy to maintain tenant isolation and predictable access control.

## Authoritative statements
- Tenant scoping must be enforced at the database layer with RLS.
- RLS policies should be consistent and documented for new tables.
- Server actions must pass the correct tenant context and avoid bypass patterns.

## Sources
- `ai/ai_authority_charter.md`
- `architecture/api-architecture.md`
- `architecture/billing-architecture.md`
- `architecture/ia_map.md`
- `architecture/performance-architecture.md`
- `architecture/system-architecture.md`
- `development/dev-seed-core-training.md`
- `development/developer-handbook/02.tech-stack-overview.md`
- `development/developer-handbook/06.database-workflows.md`
- `development/handbook/api-design.md`
- `development/handbook/file-structure.md`
- `development/handbook/naming-conventions.md`
- `development/handbook/supabase-integration.md`
- `development/handbook/testing-strategy.md`
- `development/performance_compute_boundary_contract_v1.md`
- `function_area_notes/meet_management_data_ingestion.md`
- `function_area_notes/performance.md`
- `function_area_notes/platform_architecture_devops.md`
- `function_area_notes/program_health_absence_engine.md`
- `function_area_notes/ui_ux_interaction_philosophy.md`
- `master-architecture.md`
- `product/positioning.md`
- `product/roadmap.md`
- `schema/domains/billing-subscriptions.md`
- `schema/domains/identity-users.md`
- `schema/domains/programs-teams.md`
- `schema/domains/recruiting.md`
- `schema/domains/results.md`
- `schema/domains/seasons-rosters.md`
- `schema/domains/training.md`
- `security/data-ownership.md`
- `security/privacy-model.md`
- `security/rls-framework.md`
- `theme/token-contract.md`
- `theme/ui-intuition-checklist.md`
- `ui/workflows/practice-scheduler.md`
- `ui/workflows/roster-builder.md`
