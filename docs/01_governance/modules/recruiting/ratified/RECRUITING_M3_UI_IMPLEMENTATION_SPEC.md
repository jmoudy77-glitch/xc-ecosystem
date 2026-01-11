# Recruiting M3 — UI Implementation Specification

Authority Level: Canonical UI Implementation Spec (binding)  
Runtime: Recruiting (M3 — A2 Recruiting Impact Model)  
Scope: Coach-facing UI consumption only (read-only representation layer)

---

## 1. Purpose

This specification defines how Recruiting M3 intelligence is represented in the coach-facing UI.

Recruiting M3 is an advisory intelligence runtime. The UI must:
- Explain why a recruit matters in stabilization context
- Preserve coach agency at all times
- Avoid optimization, obligation, or completion semantics
- Remain invisible when inactive or data-absent

This document governs representation only. No computation, activation, or persistence logic is defined here.

---

## 2. Non-Negotiable UI Laws

The following constraints are binding:

1. Numeric impact scores must never be rendered.
2. Optimization language is prohibited ("best", "optimal", "fix", "solve", "must", "should").
3. Sufficiency or completion language is prohibited ("resolved", "covered", "done").
4. M3 may not introduce CTAs, sorting, filtering, or automation.
5. If M3 is inactive or empty, UI must render nothing (no placeholders, no messaging).

Any violation constitutes a canonical breach.

---

## 3. Data Contract (UI-Facing)

### 3.1 Source Table
- recruiting_candidate_impacts

### 3.2 Aggregated UI Input Models

#### M3RecruitImpactSummary
- recruitId: uuid
- bandTier: 0 | 1 | 2 | 3  
  Derived as the maximum cohort_tier across that recruit’s impacts.
- capabilityNodeIds: uuid[]
- horizons: ['H0' | 'H1' | 'H2' | 'H3'][]
- rationaleSummaryText?: string  
  Optional, bounded to a maximum of three sentences.

#### M3CapabilitySupportMap
- capabilityNodeId: uuid
- isSupported: boolean  
  True if at least one pipeline recruit contributes.
- horizonsSupported?: horizon[] (not directly displayed)

If M3 is inactive, UI receives empty objects rather than flags.

---

## 4. Impact Band Semantics

Recruiting M3 surfaces impact as bands, never numeric values.

| Tier | Label |
|-----:|------------------|
| 0 | Marginal Impact |
| 1 | Supportive Impact |
| 2 | Meaningful Impact |
| 3 | High-Leverage Impact |

Ordering language is prohibited.

---

## 5. UI Surfaces and Contracts

### 5.1 Recruit Card — Impact Glyph

Purpose: Indicate that M3 insight exists for a recruit.

Rules:
- Render only when an M3 summary exists
- Neutral glyph (ring or dot cluster)
- No color severity encoding
- No interaction beyond hover tooltip

Tooltip copy (two lines maximum):
- Line 1: Impact band label
- Line 2: “Addresses H{n} stabilization gaps”

When multiple horizons exist, a compact range must be used (e.g., H1–H2). Lists are prohibited.

On mobile, the tooltip is omitted.

---

### 5.2 Recruit Detail Panel — Stabilization Contribution Section

Purpose: Primary interpretability surface for M3.

Placement: Below evaluation summary and above notes/media.

Structure (fixed order):
1. Section header: “Stabilization Contribution”
2. Impact band label (text only)
3. Capability node names
4. Horizon context (e.g., “H1–H2 Window”)
5. Rationale (optional)

Rationale rules:
- Maximum of three sentences
- If absent, the rationale block is omitted entirely
- Must include the advisory disclaimer text:  
  “Advisory signal only.”

No expand/collapse behavior is allowed by default.

---

### 5.3 Stabilization Workspace — Capability Support Annotation

Purpose: Provide continuity between pipeline and stabilization surfaces.

Rules:
- Single neutral dot per capability node
- Render only when supported
- No counts, stacking, or aggregation

Hover copy:
“Pipeline candidates provide partial stabilization coverage here.”

Hover copy is omitted on mobile.

---

## 6. Inactive or No-Data Behavior

When the M3 runtime is inactive or no impacts exist:
- All M3 UI elements render null
- No placeholders, banners, or messages are shown
- No affordance to enable M3 is presented

M3 must feel naturally present rather than promoted.

---

## 7. Accessibility Requirements

- All glyphs must include an aria-label of the form:  
  “Recruiting insight available: {Impact Band Label}”
- No color-only distinctions are permitted
- Textual meaning must always be present

---

## 8. Testing and Misuse Guards

### 8.1 Snapshot Tests
- No M3 data results in no rendered artifacts
- M3 data renders band label, capability nodes, and horizon context only

### 8.2 Copy Lint (Required)
Rendered UI copy must not contain the following terms:
fix, solve, must, should, optimal, best, complete, done

### 8.3 Ordering Guard
Pipeline ordering logic must not consume M3 data by default.

---

## 9. Explicit Non-Goals

This specification does not define:
- Sorting strategies
- Aggregation views
- Coach actions
- Cross-recruit comparisons
- Team-level rollups

Any such behavior requires a separate canon.

---

## 10. Canonical Outcome

A compliant implementation ensures a coach can:
- Understand why a recruit matters
- Relate insight to stabilization context
- Ignore or override the signal without friction

If a coach concludes, “The system says I should recruit this athlete,” this specification has been violated.
