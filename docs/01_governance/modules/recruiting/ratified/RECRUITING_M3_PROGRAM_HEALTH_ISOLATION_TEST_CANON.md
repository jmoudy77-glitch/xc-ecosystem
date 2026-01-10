# RECRUITING M3 — PROGRAM HEALTH ISOLATION TEST CANON
## Cross-Runtime Integrity & Non-Mutation Law

---

### Article M3-PH-I — Purpose

This canon defines the **mandatory isolation guarantees and verification tests** required to ensure that Recruiting M3 does not mutate, influence, or implicitly alter Program Health canonical state.

Its purpose is to preserve Program Health sovereignty while allowing M3 to exist as a strictly advisory modeling layer.

---

### Article M3-PH-II — Absolute Isolation Principle

Recruiting M3 must be **fully isolated** from Program Health canonical state.

Under no circumstance may M3:
- Write to Program Health tables
- Trigger Program Health recomputation
- Alter Program Health snapshots
- Influence Program Health severity, horizon, or absence determination

---

### Article M3-PH-III — Prohibited Interactions

The following interactions are explicitly forbidden:

1. Writes to:
   - `program_health_absences`
   - `program_health_snapshots`
   - `program_health_ledger`
2. Invocation of:
   - A2 computation engines
   - Program Health causal chains
3. UI binding that:
   - Substitutes M3 output for Program Health truth
   - Masks or suppresses Program Health absences

Any occurrence constitutes a constitutional violation.

---

### Article M3-PH-IV — Required Isolation Tests

Before M3 activation, the following tests **must pass**:

1. **Write Isolation Test**
   - Verify no M3 process has database write access to Program Health schemas.

2. **Trigger Isolation Test**
   - Verify no M3 execution path triggers Program Health recomputation jobs or events.

3. **Read-Only Consumption Test**
   - Verify Program Health may read M3 outputs only as optional context.
   - Verify absence of hard dependencies on M3.

4. **UI Truth Priority Test**
   - Verify Program Health UI always defaults to canonical A2 reality.
   - Verify any M3-derived context is explicitly labeled advisory.

---

### Article M3-PH-V — Failure Handling

- Failure of any isolation test:
  - Blocks M3 activation
  - Requires remediation
  - Requires ledger notation if activation was attempted

- Any detected violation post-activation requires:
  - Immediate rollback
  - Canonical incident recording

---

### Article M3-PH-VI — Relationship to M3 Activation Gate

This canon satisfies **Precondition #6** of the M3 Activation Gate.

No M3 activation promotion may proceed without this canon being ratified and its tests defined.

---

### Ratification

The Recruiting M3 Program Health Isolation Test Canon is hereby ratified as authoritative.

All Recruiting M3 activation efforts must conform strictly to this canon.
