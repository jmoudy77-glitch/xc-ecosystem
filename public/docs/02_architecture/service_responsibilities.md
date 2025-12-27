# Service Responsibilities

## Purpose
Clarify responsibilities between server actions, API routes, client components, and background jobs.

## Scope
Next.js App Router, Supabase access patterns, Stripe webhooks, AI jobs.

## Authoritative statements
- Prefer reusable **server actions** for data logic (durability and reuse).
- API routes are for: webhooks (Stripe), external callbacks, and narrowly scoped integrations.
- Client components should not embed complex data ownership logic; they orchestrate UI and call server actions.

## System interactions
- Coding standards and patterns live in `07_implementation/*`.

## Sources
- `architecture/api-architecture.md`
- `architecture/billing-architecture.md`
- `architecture/ia_map.md`
- `architecture/system-architecture.md`
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
- `development/handbook/file-structure.md`
- `development/handbook/supabase-integration.md`
- `development/handbook/testing-strategy.md`
- `function_area_notes/ai_analytics_modules.md`
- `function_area_notes/meta_session_logs.md`
- `function_area_notes/partnerships_expansion.md`
- `function_area_notes/performance.md`
- `function_area_notes/platform_architecture_devops.md`
- `function_area_notes/practice_scheduler_planner.md`
- `function_area_notes/program_health_absence_engine.md`
- `function_area_notes/recruiting.md`
- `function_area_notes/ui_ux_interaction_philosophy.md`
- `master-architecture.md`
