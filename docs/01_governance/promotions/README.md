# Promotions

This directory contains **auditable promotion records** documenting when canonical
governance-layer documents are formally promoted into repository changes.

Promotions establish:
- the authoritative source artifact
- the exact scope of change
- explicit acceptance criteria
- traceability between design law and implementation
- rollback instructions

## Purpose

Promotions prevent architectural drift by making every change traceable to a locked
governance artifact rather than to transient chat threads or ad hoc edits.

## Naming Convention

Promotion records must follow:

YYYY-MM-DD__<artifact>__promotion.md

Examples:
- 2025-12-28__docs_promotions_rails__promotion.md
- 2026-01-04__a1_absence_engine__promotion.md

## Required Sections in Every Promotion Record

- Source
- Scope
- Files Created / Edited
- Acceptance Criteria Results
- Traceability
- Rollback

## Edit Policy

Promotion records are append-only.
Once created, they may only be amended to correct factual errors, and any amendment
must be explicitly noted within the file.
