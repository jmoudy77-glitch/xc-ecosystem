# Program Health Inference / Staging Law (Ratified)

These registries are NON-CANONICAL and exist solely to stage speculative signals and repair proposals.

Authoritative canonical registries remain:
- public.program_health_capability_nodes
- public.program_health_absence_determinations
- public.program_health_drift_snapshots

Inference registries (NON-CANONICAL):
- public.program_health_inference_absences
- public.program_health_inference_drift
- public.program_health_inference_repairs

Binding rules:
1) No inference registry may be rendered as “canonical.”
2) Any promotion derived from inference MUST declare blast radius and provenance.
3) Inference may be cleared, replaced, or superseded without ledger mutation.
4) Canonicalization may occur only via atomic promotion.

UI rule:
- All inference surfaces must be labeled “inference.”
- Health Brief may display inference as “proposed,” never as “truth.”
