# Data Flow

## Purpose
Define how data is created, derived, stored, and consumed across the system.

## Scope
Covers ingestion, user-generated data, derived analytics, and AI outputs.

## Authoritative statements
- Distinguish **stored facts** (events, performances, roster states) from **derived analytics** (scores, probabilities, projections).
- Derived outputs must be reproducible or auditable (inputs, versioning, timestamps).
- Data access must be tenant-scoped and policy-enforced (RLS + server action guards).

## System interactions
- AI systems declare their inputs/outputs in `05_ai_systems/*`.
- Implementation patterns for storage and access are in `07_implementation/*`.

## Sources
- `ai/pipeline-projection.md`
- `ai/scout-score.md`
- `architecture/data-flow.md`
- `architecture/event-model.md`
- `architecture/ia_map.md`
- `architecture/performance-architecture.md`
- `architecture/system-architecture.md`
- `development/performance_compute_boundary_contract_v1.md`
- `features/inquiries.md`
- `features/recruiting-pipeline.md`
- `features/transfer-portal.md`
- `function_area_notes/ai_analytics_modules.md`
- `function_area_notes/meet_management_data_ingestion.md`
- `function_area_notes/program_health_absence_engine.md`
- `function_area_notes/recruiting.md`
- `function_area_notes/roster_scholarships.md`
- `master-architecture.md`
- `planning/milestones.md`
- `product/roadmap.md`
- `schema/domains/recruiting.md`
- `schema/domains/results.md`
- `ui/workflows/meet-manager.md`
- `ui/workflows/recruiting-board.md`
- `xc_ecosystem_ui_architecture_doctrine.md`
