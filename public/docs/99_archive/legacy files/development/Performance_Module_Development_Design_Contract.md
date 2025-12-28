# Performance Module — Development & Design Contract

## Purpose
This contract formalizes the architectural, design, and behavioral commitments governing the Performance Module within the XC‑Ecosystem. It is binding guidance for database design, computation layers, UI/UX decisions, and AI integration. Any implementation that violates this contract is considered architecturally incorrect, even if technically functional.

---

## 1. Core Mission
The Performance Module is an **intelligence briefing surface**, not:
- a calculator,
- a recommendation engine,
- a decision-maker,
- or an AI‑driven authority.

Its purpose is to **compress complexity into defensible understanding** so coaches can decide with confidence while retaining full judgment and control.

---

## 2. Intel‑Prime Architecture (Non‑Negotiable)

### Layered Truth Model
1. **Raw Ground Truth**
   - Immutable performance records
   - Fully auditable
   - No inference, no AI

2. **Deterministic Mathematical Prime**
   - Explicit, explainable formulas
   - Versioned rulesets
   - Stored outputs (never ephemeral)

3. **Rule‑Based Signals**
   - Pattern detection only
   - Confidence‑bounded
   - Attention flags, not conclusions

4. **AI Interpretation Layer**
   - Read‑only
   - No math, no facts, no authority
   - Explains, contextualizes, and deliberates

> Canonical rule: **AI may never write the prime. AI may only read the prime.**

---

## 3. Subject & Perspective Model

### Categorical Axis (Explicit)
- **Athlete Performance**
- **Team Performance**

This axis is:
- chosen explicitly,
- always visible,
- never inferred.

### Fluid Axis (Implicit)
- **Strategic vs Tactical** thinking is revealed through:
  - time horizon,
  - language,
  - signal urgency,
  - visual emphasis.

There are **no strategic/tactical modes or toggles**.

> Governing sentence: **Subject is chosen. Perspective is revealed.**

---

## 4. Intelligence Category Hierarchy (Canonical Order)

1. Performance Level (anchor)
2. Trajectory & Direction
3. Consistency & Reliability
4. Contextual Sensitivity
5. Alignment & Structure
6. Signals & Attention Flags
7. Historical Positioning
8. Optional AI Interpretation

Nothing downstream may override what precedes it.

---

## 5. Team Performance Intelligence
Team intelligence is **not** a simple aggregation of athletes.

It captures:
- scoring distribution,
- depth & coverage,
- volatility & risk,
- trajectory across seasons,
- structural warnings.

Athlete and Team views share:
- the same categories,
- the same language,
- the same visual grammar.

They differ only in scope and aggregation.

---

## 6. Lenses & Time Horizons

- Lenses are **deterministic system contracts**, not UI filters.
- Lenses are globally defined and versioned.
- Programs may select defaults, but may not alter lens math.

### v1 Required Horizons
- Athlete: recent, season, career
- Team:
  - medium‑range: **team season**
  - long‑range: **rolling multi‑season window**

No “strategic mode” exists — horizon emerges from lens.

---

## 7. AI Interaction Model

### Default Briefing
- Math‑anchored
- Calm
- Non‑directive
- Fully useful without AI

### Brainstorm Modal
- Optional, intentional escalation
- Large, centered modal
- Exploratory framing
- AI may:
  - synthesize,
  - compare,
  - explore scenarios,
  - request approved visuals.

AI may **not**:
- prescribe actions,
- invent metrics,
- create urgency,
- collapse ambiguity.

All AI output is ephemeral.

---

## 8. Silence & Failure Policies

### Silence Is a Feature
The system remains silent when:
- data is sparse,
- confidence is low,
- changes are noise,
- causality is unclear.

Silence is never marked as an error.

### Failure Behavior
When intelligence is weak, the system becomes:
- calmer,
- simpler,
- more transparent.

Never louder or more confident.

---

## 9. Coach Mental Exit

On exit, the coach must feel:
- oriented,
- informed,
- unpressured,
- in control.

The system:
- suggests no next steps,
- forces no conclusions,
- persists no AI interpretation.

> Canonical rule: **The system closes with clarity, not conclusions.**

---

## 10. Language & Personality Charter (Binding)

AI must:
- adapt subtly to coach vernacular,
- never be condescending, patronizing, or petulant,
- immediately disclose limitations,
- favor honesty over completeness.

Personality is expressed through **tone**, never authority.

---

## 11. North‑Star Test (Validation Gate)

> **If AI were turned off tomorrow, would this still be the best performance intelligence tool a coach has ever used?**

This module passes that test.

AI compresses cognition — it does not create truth.

---

## 12. Enforcement

Any implementation that:
- introduces black‑box logic,
- allows AI to write intelligence,
- collapses ambiguity prematurely,
- forces action,
- or increases cognitive load

**violates this contract** and must be corrected.

---

## Canonical Closing Statement

**Math is the system.  
AI is the analyst.  
Coaches decide.**
