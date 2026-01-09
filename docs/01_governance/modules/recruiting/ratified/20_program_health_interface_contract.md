# Program Health ↔ Recruiting Interface Contract (Ratified)

## 1) Relationship (explicit)
Recruiting is not a subset of Program Health.
Recruiting and Program Health are peer domains with a bidirectional data relationship.

Bidirectional flow governs data synchronization only; it does not confer shared diagnostic authority.

## 2) Program Health → Recruiting (inputs)
Program Health provides canonical inputs for Recruiting, including:
- absence classification (including recruitable vs non-recruitable designation)
- envelope/tolerance definitions for recruitable risk metrics (by horizon where applicable)
- constraint profile required to interpret recruiting impact
- recruitable deficit set (the only deficits Recruiting may act upon)

Recruiting must treat these as canonical facts.

## 3) Recruiting → Program Health (feedback)
Recruiting provides state feedback that Program Health may consume, including:
- roster-state changes attributable to recruiting actions (filled slots, additions, removals)
- recruiting pipeline state signals relevant to planning and exposure tracking
- auditable derived signals that affect program-state evaluation (without reclassifying absences)

Recruiting must not write or mutate Program Health diagnostic indicators or absence determinations.

## 4) Authority rule (hard)
Program Health retains diagnostic authority at all times.
Recruiting may not redefine, override, or “correct” Program Health classifications or envelopes.
