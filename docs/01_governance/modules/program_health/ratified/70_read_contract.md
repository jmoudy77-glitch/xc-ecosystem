# Program Health Read Contract (Ratified)

This contract defines the only lawful read surfaces and query behaviors for Program Health.

Law anchors:
- genesis/module/program_health/ratified/10_active_law.md
- genesis/module/program_health/ratified/20_ui_constitution_v1.md
- genesis/module/program_health/ratified/50_runtime_data_law.md
- genesis/module/program_health/ratified/60_registry_schemas.md

---

## I. Authoritative Read Surfaces (canonical)

Program Health may read only from:

1) public.program_health_capability_nodes  
2) public.program_health_absence_determinations  
3) public.program_health_drift_snapshots

Plus any views that are explicitly declared as provenance-safe in a ratified amendment.

No other tables or analytics caches may be used as “truth.”

---

## II. RLS Requirement (binding)

All reads MUST flow through RLS-safe queries.

- If a query path would require admin bypass, that surface is not lawful for the coach-facing instrument.
- Admin-only diagnostics, if ever needed, must be a separate constitutionally-amended instrument mode.

---

## III. Query Shapes (binding)

### A) Structural Status Banner
- Load latest drift snapshot for program_id (snapshot_at desc, limit 1)
- Load counts:
  - absences by violation_type
  - latest issued_at

### B) Capability Drift Map
- Primary source is latest drift snapshot field jsonb
- If drift snapshot missing:
  - render “no snapshot” state without inventing a field
  - allow user to continue into Absence Register and Health Brief

### C) Absence Register
- Select latest N absence determinations (issued_at desc)
- Must include:
  - id, issued_at, violation_type, severity, confidence_class
  - capability_node_id
  - provenance (at least promotion_id + source_tables)

### D) Health Brief (single-layer drilldown)
- Join absence_determination -> capability_node
- Render proof/lineage if canonical; otherwise label as inference
- Must never become a multi-page analytical surface

---

## IV. Provenance Minimum (binding)

Every rendered object MUST expose, directly or via “Truth View”:
- promotion_id
- issuer
- source_tables
- timestamp (issued_at or snapshot_at)

If any are missing, the UI must mark the surface as inference and deny canonical labeling.

---

## V. Performance Constraints (binding)

- Default limits must be bounded (e.g., 50 absences, 200 max)
- All queries must filter by program_id
- Index-backed ordering is required (issued_at desc; snapshot_at desc)
