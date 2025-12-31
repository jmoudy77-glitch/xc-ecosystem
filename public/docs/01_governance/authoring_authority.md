# --- FILE: /docs/governance/authoring_authority.md ---
# Authoring Authority Contract
**Status:** BINDING  
**Applies to:** xc-ecosystem (all modules), with explicit enforcement for Program Health UI

---

## 1) Purpose
This contract prevents drift, resets, and re-description failures by assigning a single authoritative surface to each domain.

---

## 2) Authority table (binding)

| Domain | Authoritative surface | Non-authoritative surfaces |
|---|---|---|
| Spatial geometry / topology (Program Health) | `/docs/canonical_planes/program_health_plane.md` | Chat threads, screenshots, handoffs, “descriptions” |
| UI implementation | Repo source (`app/ui/program-health/*`) | Chat, memory, verbal agreements |
| Runtime truth / causality | Database read surfaces + runtime engines (A1) | UI computations, UI-derived truth |
| Migrations / promotions | Codex-executed migrations + `/supabase/migrations/*` | Ad hoc SQL, manual DB edits |
| Advisory / ideation | Chat | N/A |

---

## 3) Enforcement rules

### 3.1 Geometry rule (Program Health)
If a geometry decision is not represented in the canonical plane spec, it is not binding and must be treated as provisional.

### 3.2 Code rule
Code must implement the plane spec, not redefine it.
If code and spec conflict, **spec wins** until the spec is amended via the change protocol.

### 3.3 Thread rule
Threads may propose deltas, but threads may not become the authoritative memory for spatial truth.

---

## 4) Change protocol (minimal, mandatory)

### 4.1 Locked foundation changes
A locked foundation change requires:
1) Update canonical plane spec (append delta).
2) Update code accordingly.
3) Commit both in the same commit.

### 4.2 Non-locked evolution
Visual polish and micro-tuning may proceed without amending governance, provided the canonical basis remains intact.

---

## 5) Operational mode (permanent)
- Spatial work (Program Health instrument): governed by the canonical plane spec.
- Runtime work: governed by promotions/migrations.
- Chat: advisory only, never canonical.

This contract is intentionally short; its value is enforceability.
