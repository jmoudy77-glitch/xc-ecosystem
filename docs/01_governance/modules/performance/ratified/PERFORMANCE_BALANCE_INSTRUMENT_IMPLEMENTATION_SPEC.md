# Performance Balance Instrument
## Instrumentation Implementation Specification

---

## Article B-XXI — Implementation Authority

This specification governs the concrete implementation of the Performance Balance Instrument across rendering, data flow, performance, and validation.

This document binds implementation behavior to previously ratified canon:
- P-0001 (Layer Model)
- P-0002 (Projection Interaction Law)
- P-0003 (Derivation Law)

No implementation detail may violate those artifacts.

---

## Article B-XXII — Rendering Architecture

### Volumetric Context Layer (3D)

- Rendering MUST be GPU-accelerated.
- Rendering MUST be deterministic for identical canonical inputs.
- Rendering MUST be read-only.
- Rendering MUST support continuous orbital rotation with inertia dampening.
- Rendering MUST support snap-to-projection thresholds defined in P-0002.

Visual constraints:
- Balance plane rendered as translucent neutral surface.
- Plane depth MUST be shallow and non-dominant.
- Seismograph waveforms rendered as continuous polylines or splines.
- Waveforms MUST intersect the plane at equilibrium crossings.
- Distance from plane is the sole carrier of imbalance magnitude.

No labels, ticks, or values may be rendered in volumetric state.

---

### Projection Rendering (2D)

Upon snap:
- Volumetric rendering MUST be suppressed.
- Projection rendering MUST replace it fully.

End-On Projection:
- Render all dichotomies as distributed vertical indicators.
- Indicators represent signed displacement at selected temporal index.
- Ordering MUST be stable across time.

Side-On Projection:
- Render one dichotomy as a left-to-right time series.
- Time axis MUST be linear and uniformly spaced.
- No interpolation between canonical temporal indices.

---

## Article B-XXIII — Data Flow Contract

### Canonical Input Stream

Implementation MUST consume:
- Canonical dichotomy list D
- Canonical temporal index list T
- Canonical signal s(d, t)

No client-side smoothing, prediction, or extrapolation is permitted.

### Caching Rules

- Volumetric data MAY be cached per render session.
- Projection data MUST be derived from cached volumetric data.
- Summary glyph data MUST be derived from the same cached source.

At no time may divergent data paths exist between layers.

---

## Article B-XXIV — Performance Constraints

- Initial instrument activation MUST render within 200ms on baseline hardware.
- Orbital rotation MUST maintain ≥ 45 FPS.
- Projection snap transition MUST complete within 120ms.
- Temporal step transitions MUST complete within 80ms.

If constraints cannot be met:
- Fidelity MUST degrade before semantics.
- No semantic shortcuts are permitted.

---

## Article B-XXV — Visual Semantics Enforcement

- Equilibrium plane color MUST be neutral/white.
- Above-plane deviation MUST bias toward blue.
- Below-plane deviation MUST bias toward purple.
- Saturation MAY increase with magnitude.
- Hue MAY NOT encode urgency or alerts.

Animation:
- Passive waveform motion permitted in volumetric layer.
- No motion permitted in projection states except snap transitions.

---

## Article B-XXVI — Interaction Enforcement

- Volumetric layer MUST not register pointer events.
- Projection layer MUST exclusively register interaction events.
- Scroll wheel behavior MUST obey P-0002 mutual exclusivity rules.
- Any interaction outside projection states is a violation.

---

## Article B-XXVII — Summary Glyph Implementation

- Glyph MUST compute from derivation rules in P-0003.
- Glyph MUST recompute only when t0 changes.
- Glyph MUST not recompute on UI interaction alone.
- Glyph MUST visually reflect quantized magnitude tiers.

Invocation behavior:
- Activating the glyph MUST open the Balance Instrument.
- Default projection state MAY be restored from last session memory.
- Invocation MUST NOT alter canonical state.

---

## Article B-XXVIII — Validation & Drift Detection

Implementation MUST include validation hooks that verify:
- Projection values equal volumetric values at corresponding indices.
- Glyph values equal derived values at t0.
- No mismatch exists between layers.

Detected drift MUST:
- Be logged
- Be surfaced to diagnostics
- Never be silently corrected

---

## Article B-XXIX — Accessibility & Degradation

- Instrument MUST remain interpretable without color alone.
- Shape, position, and distance MUST carry meaning.
- If 3D rendering is unavailable:
  - Projection mode MAY be used as fallback
  - Summary glyph MUST remain accurate

Fallback behavior MUST preserve canonical semantics.

---

## Canonical Summary

- Rendering follows canon, not convenience
- One data source feeds all layers
- Performance constraints are binding
- Degradation preserves truth
- Drift is detectable and promotable
