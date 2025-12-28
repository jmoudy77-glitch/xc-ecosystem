# Training Module – Locked Decisions & Principles

This document captures **finalized decisions and principles** established during the Training page architecture and UX discussion.  
It is intended to **prevent re‑litigation**, guide future development, and support marketing and onboarding clarity.

---

## 1. Core Purpose of the Training Page

The Training page **replaces a coach’s external calendar**.

It is not a supplement, planner, or reference view — it is the **primary daily operating surface** for a coach.

Coaches open Training with two core intents:

1. **Execute quickly**  
   Perform a specific task (schedule, edit, review) with minimal friction.
2. **Contextualize quickly**  
   Understand today and the upcoming week at a glance.

The page must support *both intents simultaneously* without navigation or context loss.

---

## 2. Information Architecture (Locked)

### Primary Structure
- **Daily agenda is the primary surface**
- **Weekly calendar is secondary** and feeds the daily agenda

### Layout
- **Left panel:** Full-day agenda timeline  
  - Visible time scale
  - Gaps between events are intentional and meaningful
- **Right panel:** Contextual detail for the selected event and day  
  - Event details
  - Weather & heat risk
  - Edit actions

### Weekly Calendar Rules
- Displays training events only
- Days are clickable to populate the daily agenda
- Events in the weekly view are **informational only**
- No drill-in or editing from weekly calendar

### Practice Scheduling
- Scheduling occurs by clicking empty **time slots in the daily agenda**
- Weekly calendar is not an action surface

---

## 3. Ownership & Visibility Model (Critical)

### Program-Wide Visibility
- Training is **program-wide by default**
- Required for shared facility awareness across teams

### Strict Ownership
- Coaches may **only select or edit practices they own**
- Non-owned events are visible but non-interactive

### Scope Toggle
- Team / Program toggle affects **calendar visibility only**
- Permissions are unchanged by scope

**Principle:**  
> Shared awareness without shared chaos.

---

## 4. Weather & Heat Risk Philosophy

### Decoupled Architecture
- Weather display is **not coupled to practice IDs**
- Practice creation may attach weather data
- Display layer reads from cached weather only

### Caching Strategy
- Cache **current week + next week**
- No per-practice weather fetches

### UX Rules
- Heat risk is a **visual overlay**, not just a number
- Weather lives inside Training context
- Safety information should be visible without navigation

---

## 5. Modal-First Workflow Pattern

The Training page must **never eject the coach from context**.

### Tools Open as Large Modals
- Exercise library
- Workout library
- Athlete training logs
- Practice builder

### Edit Actions
- Live in the **right-side details panel**
- Open modals, not new pages

---

## 6. Default Selection & State Behavior

- If a day has owned events:
  - Select the **next upcoming** owned event
  - If none remain, select the **last-started**
- If a day has no training:
  - Show “No scheduled training for today”
- Agenda panel is **never empty**
- Week navigation is client-side only (no page refresh)

---

## 7. Timeline & Interaction Rules

- Fixed zoom (no zoom controls)
- Half-hour granularity
- Familiar calendar visual language
- Subtle but clear affordances
- Reliability and predictability prioritized over novelty

---

## 8. Global Styling Principle

- Glass / liquid styling is **global**, not page-specific
- Pages rely on shared tokens and classes
- Containers may be transparent while children retain glass/tint
- Avoid per-page visual divergence

---

## 9. Product Positioning Summary

**Training is:**
- The coach’s daily command center
- A replacement for fragmented calendar tools
- Contextual, safety-aware, and execution-focused

**Training is not:**
- A static planner
- A read-only schedule
- A collection of disconnected tools

---

_End of locked decisions document._
