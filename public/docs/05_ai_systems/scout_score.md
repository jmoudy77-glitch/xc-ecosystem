# Scout Score (AI System)

## Purpose
Describe the user-facing capabilities, workflows, and integration points for this module.

## Scope
Defines what the module does and what it depends on. Does not redefine governance or architecture.

## Authoritative statements
- This module must comply with `01_governance/*` and `02_architecture/module_boundaries.md`.


## Primary workflows
- Key flows should be implemented as minimal-touch, coach-intuitive interactions.
- Use drag-and-drop where feasible for high-frequency tasks.

## Data and integration points
- Source-of-truth entities and states are defined in `03_domain_models/*`.
- Persisted outputs must be auditable when derived.

## Sources
- `ai/scout-score.md`
- `features/recruiting-pipeline.md`
- `function_area_notes/ai_analytics_modules.md`
- `function_area_notes/meet_management_data_ingestion.md`
- `function_area_notes/recruiting.md`
- `product/roadmap.md`
- `schema/domains/results.md`
- `ui/workflows/meet-manager.md`
- `ui/workflows/recruiting-board.md`
