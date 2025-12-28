# UI Philosophy
**Authority Level:** UI System Law (binding)  
**Applies To:** All coach-facing pages, modals, panels, and high-frequency workflows  
**Purpose:** Codify interaction principles so the UI behaves like a coherent operating system—not a collection of pages.

---

## 1. The Core UI Mission
The UI exists to convert complexity into **coaching clarity**.
It must reduce cognitive load by:
- organizing work into predictable structures
- surfacing the right next actions
- preserving context and reversibility
- maintaining professional restraint (no clutter, no noise)

This is structural relief, not convenience.

---

## 2. The Four Coach Certainties (Non-negotiable)
Every coach-facing surface must satisfy:

1) **Where am I?** (clear location, module, season/team context)  
2) **Where can I go?** (predictable navigation, visible next steps)  
3) **What will happen if I act?** (consequence preview, clear labels)  
4) **Can I undo it?** (reversibility, audit trail, safe edits)

If any of these are missing, the surface is incomplete even if functional.

---

## 3. Minimal-Touch Policy (with restraint)
**Goal:** Minimize clicks and keystrokes while keeping screens uncluttered.
- High-frequency actions must be one-click, drag-first, or inline-edit.
- Low-frequency actions may require confirmation and more structure.
- Never reduce clicks by hiding meaning; clarity wins over speed when they conflict.

---

## 4. Progressive Disclosure
The default view should be simple and readable.
Depth is revealed in layers:
- summary → drilldown
- compact cards → expanded rationale
- simple forms → advanced panels

Coaches should not be forced to read an “analytics dashboard” to take basic action.

---

## 5. Coach Cognition Alignment
Design for how coaches think:
- time windows (today / this week / this season)
- roster groups and event groups
- pipeline stages
- readiness/availability states
- season phases

UI should follow coaching mental models, not database schemas.

---

## 6. Reversibility and Safety
- Prefer reversible operations by default.
- Provide explicit “Undo/Remove” patterns in builders.
- Use confirmations only for high-impact/irreversible actions.
- Always show who/what changed state (attribution) where relevant.

---

## 7. Drag-and-Drop Preference (when it reduces friction)
Drag-and-drop is preferred when it:
- reduces steps materially
- matches mental model (moving a recruit through pipeline, adding events to practice)
- remains explainable and reversible

Drag-and-drop must never be required for accessibility; provide alternate actions.

---

## 8. Modal Doctrine for Deep Workflows
Deep workflows should be built as:
- **Large centered modal** as the primary container
- Optional inner slide-out panels for advanced detail

Avoid right-side panels as the primary container for complex builders.

---

## 9. Consistency is a feature
Consistency reduces cognitive load.
- navigation shell is stable across program pages
- key patterns repeat (cards, queues, boards, builders)
- states use consistent labels and colors via semantic tokens

---

## 10. Definition of Done (UI)
A UI surface is “done” only if:
- it satisfies the Four Coach Certainties
- it matches module boundaries (no cross-module shadow truth)
- it passes the UI Intuition Checklist
- it presents AI outputs with provenance + uncertainty (where applicable)
