# Program Health Registry Schemas (Ratified)

This document defines the canonical registry schemas for Program Health runtime surfaces.

Law anchors:
- genesis/module/program_health/ratified/10_active_law.md
- genesis/module/program_health/ratified/20_ui_constitution_v1.md
- genesis/module/program_health/ratified/30_disc_material_constitution.md
- genesis/module/program_health/ratified/50_runtime_data_law.md

---

## I. Canonical Tables

1) public.program_health_capability_nodes  
Source file: genesis/module/program_health/registries/program_health_capability_nodes.sql

2) public.program_health_absence_determinations  
Source file: genesis/module/program_health/registries/program_health_absence_determinations.sql

3) public.program_health_drift_snapshots  
Source file: genesis/module/program_health/registries/program_health_drift_snapshots.sql

---

## II. Provenance Requirements (binding)

Every row written to these tables MUST include provenance jsonb with, at minimum:
- promotion_id (YYYYMMDDNNNN or equivalent)
- issuer (human/system)
- source_tables (array)
- timestamp (when applicable)

If provenance is missing or incomplete, the UI must mark the surface as inference and deny “canonical” labeling.

---

## III. Taxonomy Enforcement (binding)

program_health_absence_determinations.violation_type is limited by machine law to:
- coverage
- redundancy
- certification
- authority
- integrity
- continuity

No additional types may be rendered without amendment.

---

## IV. Read/Write Contract (binding)

Program Health:
- may read these registries
- may compute derived views
- may not autonomously mutate other runtime state

Any write outside these registries requires explicit promotion and blast-radius declaration.
