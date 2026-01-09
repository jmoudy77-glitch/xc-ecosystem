# Canonical Mapping (Archive → Canon)
**Authority Level:** Archive Map (informational)  
**Purpose:** Provide a consistent “where does this belong?” map when extracting details from archived source material into the canonical docs.

---

## 1. Mapping by category
### Governance and doctrine
**Typical archive sources**
- `xc_ecosystem_constitution.md`
- `xc_ecosystem_conflict_resolution_doctrine.md`
- `2025-12-18_XC-Ecosystem_Design_Protocol.md`

**Canonical destination**
- `01_governance/*`

**What gets consolidated**
- sovereignty / reversibility principles
- decision protocol and precedence rules
- definitions of “authoritative truth” vs “derived analytics”

---

### Architecture
**Typical archive sources**
- `architecture/*`
- `master-architecture.md`
- `architecture/system-architecture.md`
- `architecture/data-flow.md`

**Canonical destination**
- `02_architecture/*`

**What gets consolidated**
- module boundaries and ownership
- multi-tenant model
- event/state model and data flow
- service responsibilities (handoff to `07_implementation/service_responsibilities.md`)

---

### Domain meaning
**Typical archive sources**
- `schema/domains/*`
- `security/data-ownership.md`
- `features/*` (when describing entities/states)

**Canonical destination**
- `03_domain_models/*` (meaning, invariants, boundaries)
- `/docs/schema/*` (actual schema snapshots/history), when applicable

---

### Operational workflows (coach tasks)
**Typical archive sources**
- `team-ops/*`
- `function_area_notes/*`
- `ui/workflows/*` (workflow intent)

**Canonical destination**
- `04_operational_modules/*`

---

### AI systems
**Typical archive sources**
- `ai/*`
- `function_area_notes/ai_analytics_modules.md`

**Canonical destination**
- `05_ai_systems/*`

**What gets consolidated**
- AI authority boundaries and prohibitions
- confidence semantics and output audit contract
- per-system inputs/outputs and workflow integration

---

### UI system law
**Typical archive sources**
- `ui/*`
- `theme/*`
- `xc_ecosystem_ui_architecture_doctrine.md`
- `function_area_notes/ui_ux_interaction_philosophy.md`

**Canonical destination**
- `06_ui_system/*`

---

### Implementation
**Typical archive sources**
- `development/*`
- `development/handbook/*`
- `security/rls-framework.md`
- `development/api-style-guide.md`

**Canonical destination**
- `07_implementation/*`

---

## 2. “If you only remember one rule”
Archive explains *why* and *how we got here*.
Canon explains *what is true now* and *what we must build against*.
