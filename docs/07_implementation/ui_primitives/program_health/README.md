# Program Health UI

This directory contains authoritative UI documents for the Program Health module, including:
- UI constitutions/contracts (interaction laws, invariants, non-negotiables)
- canonical discussion starters that transfer locked context into new UI threads
- implementation-facing UI specs that prevent drift

## Key Document

- `program_health_ui_starter.md` is the authoritative discussion starter for Program Health UI.
  It must be treated as locked context when designing UI so settled questions are not reopened and
  the UI remains faithful to the A1 Absence Engine.

## Naming Convention

Use short, stable names for ongoing specs (no dates), for example:
- program_health_ui_starter.md
- program_health_ui_contracts.md
- program_health_ui_components.md

Snapshots belong in `public/docs/99_archive/snapshots/`.
