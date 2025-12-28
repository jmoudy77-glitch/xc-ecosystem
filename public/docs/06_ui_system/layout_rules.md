# Layout Rules
**Authority Level:** UI System Law (binding)  
**Purpose:** Define non-negotiable layout and shell requirements for coach-facing UX.

---

## 1. Navigation Shell Requirement
All program-related pages must include:
- the hero header (program identity + context)
- the navigation shell (stable global navigation for program work)

**Exception:** A compact variant may be introduced later, but it must be explicit and documented.

---

## 2. Page Anatomy (Canonical)
Coach-facing pages should follow a predictable structure:
1. **Context header** (program/team/season; page title; breadcrumbs as needed)
2. **Primary actions** (top-right or immediately visible; limited to 1–3)
3. **Primary content** (boards, dashboards, lists)
4. **Secondary panels** (filters, insights, detail panes) via progressive disclosure

---

## 3. Deep Workflow Container Standard
Deep builders (practice builder, roster builder, complex evaluators) must use:
- a **large centered modal** as the primary container
- optional inner slide-out panel(s) for advanced detail (e.g., per-athlete assignments)

Avoid right-side panels as the primary container for complex builders.

---

## 4. Density and Readability
- Default views must be readable at a glance.
- Reserve dense tables for drill-down views.
- Use cards/rows with consistent hierarchy: label → value → status → action.

---

## 5. State Visibility
Any page that represents a state machine (recruiting pipeline, readiness, season mode) must show:
- the current state
- allowed transitions (and who can perform them)
- the consequence of transition (preview) where impact is high

---

## 6. Builder Layout Convention
For multi-pane builders:
- left: primary structure (groups, plan structure)
- center: working canvas (the thing being built)
- right: library/tooling (workouts, events, templates)
- slide-out: advanced detail (individual overrides)

This keeps the coach oriented and reduces accidental context loss.

---

## 7. Mobile / Responsive Constraint
Mobile may be supported, but the system is optimized for coach desktop usage.
Responsive behavior should preserve the mental model:
- panes become stacked
- the “working canvas” remains primary
- key actions remain visible

---

## 8. Definition of Done (Layout)
A layout is compliant if:
- nav shell + hero are present (where required)
- deep workflows use modal doctrine
- primary actions are obvious and limited
- information hierarchy is readable without scanning fatigue
