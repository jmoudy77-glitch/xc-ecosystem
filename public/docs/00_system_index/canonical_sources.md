# Canonical Sources Index

This document is the **single map of truth** for what is considered canonical within this repository’s documentation system.

## What this index is
- A stable, human-readable pointer map to canonical documents
- A governance tool to prevent drift and re-litigation
- The first stop for “which doc is authoritative?”

## What this index is not
- A substitute for the constitutions/specs themselves
- A place to restate or rewrite canonical content
- A changelog (see promotions)

---

## Canonical Constitutions (locked)

These are non-negotiable governance-layer documents. Implementations must not overwrite or “correct” them.

- **A1 Absence Engine (Canonical Constitution)**
  - `public/docs/01_governance/constitutions/a1_absence_engine.md`

> If additional constitutions exist, they must be promoted into `public/docs/01_governance/constitutions/` and listed here.

---

## Authoritative Operational Specs (TBD via promotion)

These are authoritative specs that govern implementation, but are not necessarily “constitutions.”
Only list items here when their authoritative path is unambiguous.

- Program Health UI starter/spec:
  - `public/docs/06_ui_system/program_health/program_health_ui_starter.md`
- Program Health UI contract:
  - `public/docs/06_ui_system/program_health/program_health_ui_contract.md`
- Recruiting module architecture: **TBD (promote and index)**
- Performance module spec: **TBD (promote and index)**

---

## Archive & Session Records (historical)

Snapshots are factual records and are not constitutions/specs.

- Snapshots directory
  - `public/docs/99_archive/snapshots/`

---

## Promotion Ledger (auditable handoffs)

Every material change to canonical governance/spec documents must be recorded via a promotion.

- Promotions directory
  - `public/docs/01_governance/promotions/`

---

## How to add a new canonical source

1) Promote the document into the appropriate canonical location (usually a constitution under `01_governance/constitutions/`).
2) Create a promotion record in `01_governance/promotions/`.
3) Add its path here.
