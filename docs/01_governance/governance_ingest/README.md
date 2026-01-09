# Governance ingest

`/docs` is the sole canonical documentation plane.

The `/governance` directory is tooling that can materialize/package governance content into derived artifacts.
All build outputs belong under `/governance/artifacts` and should be treated as derived outputs, not source-of-truth.

This folder exists to record that legacy governance canon was ingested from `/governance/**/ratified` into:
- `/docs/01_governance/kernel/genesis/*`
- `/docs/01_governance/modules/<module>/ratified/*`

Ingest is non-destructive: existing `/docs` files are never overwritten.
