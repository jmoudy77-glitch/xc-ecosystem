# Developer Handbook

## Purpose
Capture operational development practices, conventions, and recurring patterns.

## Scope
Local dev workflow, code standards, common pitfalls, and preferred patterns.

## Authoritative statements
- Prefer reusable server actions for data logic.
- When using Supabase in Next.js Server Components, use the working cookie pattern:
  - `const cookieStore = cookies() as any; cookieStore.get(name)?.value`
- Any change to schema/RLS must include doc updates and a migration.

## Sources
- `00-index.md`
- `ai/ai-data-sources.md`
- `architecture/ai-architecture.md`
- `architecture/api-architecture.md`
- `architecture/billing-architecture.md`
- `architecture/domain-architecture.md`
- `architecture/ia_map.md`
- `architecture/performance-architecture.md`
- `architecture/system-architecture.md`
- `development/coding-standards.md`
- `development/dev-seed-core-training.md`
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
- `development/handbook/file-structure.md`
- `development/handbook/naming-conventions.md`
- `development/handbook/supabase-integration.md`
- `development/handbook/testing-strategy.md`
- `features/billing.md`
- `function_area_notes/ai_analytics_modules.md`
- `function_area_notes/meet_management_data_ingestion.md`
- `function_area_notes/performance.md`
- `function_area_notes/platform_architecture_devops.md`
- `function_area_notes/practice_scheduler_planner.md`
- `function_area_notes/program_health_absence_engine.md`
- `function_area_notes/recruiting.md`
- `function_area_notes/ui_ux_interaction_philosophy.md`
- `index.md`
- `master-architecture.md`
- `product/positioning.md`
- `product/roadmap.md`
- `schema/domains/athletes.md`
- `schema/domains/billing-subscriptions.md`
- `schema/domains/identity-users.md`
- `schema/domains/programs-teams.md`
- `schema/domains/recruiting.md`
- `schema/domains/results.md`
- `schema/domains/seasons-rosters.md`
- `schema/domains/training.md`
- `schema/migrations/future-migrations.md`
- `schema/schema-history/2025-12-01-with-teams-and-seasons.md`
- `schema/schema-history/2025-12-01.md`
- `schema/schema-latest.md`
- `security/data-ownership.md`
- `security/privacy-model.md`
- `security/rls-framework.md`
- `theme/token-contract.md`
- `ui/workflows/meet-manager.md`
- `ui/workflows/practice-scheduler.md`
- `ui/workflows/roster-builder.md`
