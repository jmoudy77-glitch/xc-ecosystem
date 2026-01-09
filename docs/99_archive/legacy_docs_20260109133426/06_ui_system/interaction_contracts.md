# Interaction Contracts
**Authority Level:** UI System Law (binding)  
**Purpose:** Define behavioral contracts for key interactions so components remain consistent across the platform.

---

## 1. Contract: Drag-and-Drop
Drag-and-drop is preferred where it reduces steps and matches mental model.

### 1.1 Required behaviors
- clear drag affordances
- visible drop targets
- preview of resulting state change
- reversible outcome (undo/remove) where feasible
- keyboard/alternate action available (accessibility)

### 1.2 High-impact transitions
If a drag results in high-impact change (e.g., recruit → committed, roster finalize):
- require confirmation
- show consequences (what changes downstream)
- record attribution

---

## 2. Contract: Reversibility
Every destructive or high-impact action must have:
- undo/remove if feasible
- otherwise: explicit confirmation + audit entry
- clear messaging about irreversibility

---

## 3. Contract: Consequence Preview
When an action triggers downstream effects, UI must show:
- what will change
- which module(s) are affected
- whether the action is reversible
- any approvals required

---

## 4. Contract: Deep Workflow Modal Doctrine
Deep workflows use large centered modals.

### 4.1 Practice Builder (Canonical)
- `AddPracticeDialogTrigger` opens a **large centered PracticeBuilderModal**
- “Individual Assignments” control lives in the **Group Assignments header**
- the individual panel **slides between** the groups panel and the workouts/events library

This is a controlling contract for the Practice Scheduler UI.

---

## 5. Contract: Queues (Today / Next Actions)
Where a module presents a queue (Recruiting follow-ups, Performance attention list):
- show “why it’s here” (rationale)
- allow quick completion/logging
- allow snooze/dismiss with reversible record

---

## 6. Contract: AI Output Presentation (UI-level)
When AI/derived analytics appears inside a workflow:
- label as derived/forecast
- show confidence category
- provide expandable rationale
- show provenance (inputs + timestamp) when expanded
- never present as command

(See `ai_ui_guidelines.md` for full rules.)

---

## 7. Definition of Done (Interaction)
A component is compliant if:
- it behaves consistently with these contracts
- it preserves coach orientation and clarity
- it does not violate module ownership or data authority
