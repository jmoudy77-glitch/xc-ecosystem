# Constitutions

This directory contains **locked constitutional documents**: system laws, invariants, and non-negotiable definitions that govern downstream implementations.

Constitutions are:
- authoritative references for implementations
- stable anchors for project continuity
- the highest layer of governance in the documentation system

## Naming Convention

Use short, stable names (no dates), for example:
- a1_absence_engine.md
- program_health_invariants.md

## Edit Policy

Constitutions should only be changed through a **Promotion Contract** and must be accompanied by:
- a promotion record (in `01_governance/promotions/`)
- explicit justification for the change
- clear statement of what changed and why

Implementations must never overwrite or “correct” constitutions.
