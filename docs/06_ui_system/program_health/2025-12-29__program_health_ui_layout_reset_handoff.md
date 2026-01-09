# Program Health UI — Thread Handoff (Layout Reset + Instrument Contract)

**Date:** 2025-12-29  
**Purpose:** Preserve context and reset the UI plan before continuing in a new thread.

---

## Status

- Program Health **A1 engine is live**; UI is a **read-only visualization layer** over runtime emissions (**no computation, no advice**).
- UI shaping was advanced via “promotions,” but changes have been **low-impact / hard to perceive** (often width shifts).
- Current UI still reads as **incorrect / “ugly”** relative to intent: it does not yet feel like a **structural truth instrument**.

---

## What we learned (important)

### Component ownership (confirmed)
- Entrypoints: `page.tsx` and `ProgramHealthPage.tsx`
- Imports: `ProgramHealthPage` used by `page.tsx`
- Inspector + filters live in: `AbsencePanel.tsx`
  - Uses class tokens: `ph-inspector`, `ph-inspector-section`, `ph-section-title`, `ph-filter-row`, etc.
- Unmapped absences live in: `CapabilityDriftMap.tsx`
  - Uses class token: `ph-unmapped`
- Horizon Timeline panel content/title: `HorizonTimeline.tsx`
- “Canonical Inspector” appears in: `AbsencePanel.tsx` and `CausalityDrilldownPanel.tsx`
- There is **no** `ph-horizon` class (per diagnostic)
- There is **no** `ph-filters` class; filters are inside `AbsencePanel` sections

### Diagnostic script pitfall (must avoid repeating)
- “PAGE discovery” used `rg -l "Program Health"` and matched an unrelated page containing that string in a comment.
- Correct page is `page.tsx` with layout rooted in `ProgramHealthPage.tsx`.

---

## Current visual symptoms (from screenshots)

- Main panel was widened once; otherwise the page has remained largely unchanged.
- **Large dead space** below content; the “instrument” doesn’t fill/own the viewport.
- Horizon Timeline renders as **four chunky cards** even when “no emission,” creating a placeholder/dashboard vibe.
- Too many visible controls in empty states; hierarchy between **map / horizon / inspector** is unclear.
- Inspector presence/placement has felt inconsistent (and at times visually duplicative/competing).

---

## North Star reference

- Performance page demonstrates the intended system “feel”:
  - One dominant instrument surface
  - Clear hierarchy and readable flow
  - Minimal clutter and minimal dead space

---

## New target outcome (the instrument contract)

We will implement Program Health UI as:

1. **One dominant “Structural Plane”** (Capability Drift Map) that **owns the viewport**.
2. A **compact Horizon rail** (H0–H3) that **compresses** when empty.
3. Inspector is **secondary and context-driven**:
   - Appears only when a selection exists, **or**
   - Opens via **“Open Inspector”** (drawer/modal pattern).
4. **No duplicated inspector regions**; no simultaneous multi-panel clutter.
5. Empty states are **quiet** and non-distracting.

---

## Work plan for the next thread

### A) Freeze a layout contract FIRST (single canonical layout)
Define a 2-column layout (main instrument + right rail) with explicit behaviors:

- Exact empty-state behavior
- Scroll/sticky rules
- Inspector placement pattern (choose one):
  - **Option 1:** Inspector in right rail below Horizon
  - **Option 2:** Inspector as drawer/modal triggered by “Open Inspector”
- Decide where Unmapped Absences belong:
  - Under the map (collapsed), or
  - Inside inspector

### B) Implement in 2–3 deliberate promotions (must be visibly different)
1. **Layout skeleton + viewport fill + rail behavior**
2. **Horizon empty-state compression (JSX logic)** + hide controls unless actionable
3. **Inspector gating + selection-driven rendering**; remove duplicates

---

## Critical constraint

- Do **not** move to “wiring” deeper behaviors until layout contract is correct and stable.
- Promotions must produce **visible changes**; if not, stop and re-scope.

---

## Execution style preference

- Always provide a **single copy/paste Codex command per promotion**.
- No direct edits in-chat; **Codex promotions only**.
