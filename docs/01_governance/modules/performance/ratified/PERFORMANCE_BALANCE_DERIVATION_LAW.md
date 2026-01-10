# Performance Balance Instrument
## Derivation Law (Model → Summary Glyph)

---

## Article B-XII — Derivation Authority

All balance summaries, indicators, and glyphs are derived artifacts.

The Volumetric Context Layer of the Performance Balance Instrument is the sole canonical source for balance reality.

Derived summaries may observe and compress reality but may never define, overwrite, or bypass it.

---

## Article B-XIII — Canonical Inputs

All derivations MUST use only:

1. Canonical balance plane (equilibrium reference)
2. Canonical dichotomy set D = {d1..dn}
3. Canonical temporal indices T = {t0..tk} where t0 is most recent
4. Canonical per-dichotomy tension signal:
   - signed displacement from plane over time
   - s(d, t) ∈ ℝ where:
     - s = 0 indicates equilibrium
     - s > 0 indicates above-plane tension
     - s < 0 indicates below-plane counter-tension

No other inputs (including UI state, coach actions, or external heuristics) are permitted.

---

## Article B-XIV — Derived Summary Glyph (Program Health Glyph Bar)

The Performance Summary Glyph SHALL reuse the Program Health glyph bar architecture as a structural pattern, but remains strictly Performance-scoped in data and derivation.

The glyph is defined as a quantized, glanceable compression of the balance state at t0 (most recent canonical time).

The glyph MUST NOT encode temporal history directly.

---

## Article B-XV — Per-Dichotomy Glyph Components

For each dichotomy d ∈ D at time t0, derive:

1. Magnitude
   - m(d) = |s(d, t0)|

2. Direction
   - dir(d) =
     - ABOVE if s(d, t0) > 0
     - BELOW if s(d, t0) < 0
     - BALANCED if s(d, t0) = 0

3. Volatility Flag (optional, non-temporal display)
   - v(d) is a categorical qualifier derived from the immediate neighborhood of t0:
     - uses only the last W canonical samples including t0 (W is fixed system-wide)
     - v(d) ∈ {STABLE, SHIFTING, SPIKING}
   - v(d) must be expressed only as a subtle stylistic qualifier, never as a history chart

Volatility flags may signal instability without presenting a time series.

---

## Article B-XVI — Quantization Law

The glyph MUST quantize magnitude into exactly five tiers:

- Q0: Balanced
- Q1: Low imbalance
- Q2: Moderate imbalance
- Q3: High imbalance
- Q4: Critical imbalance

Quantization thresholds are fixed, globally consistent, and defined by canonical configuration.

No adaptive or relative thresholds are permitted in the glyph.

---

## Article B-XVII — Aggregation Law

The glyph MUST include a single global summary derived at t0:

1. Global imbalance score (non-authoritative, derived)
   - G = Σ m(d) over all d ∈ D

2. Dominant direction (net bias)
   - NET =
     - ABOVE if Σ s(d, t0) > 0
     - BELOW if Σ s(d, t0) < 0
     - BALANCED otherwise

The global summary may be used for ordering, prominence, and alert gating, but may not override per-dichotomy truth.

---

## Article B-XVIII — Rendering Constraints

The glyph MUST:
- Use the same equilibrium semantics as the instrument plane:
  - equilibrium = white/neutral
  - deviation increases saturation toward blue/purple scale
- Encode direction without arrows:
  - ABOVE vs BELOW is indicated by structural bias consistent with Program Health glyph bar conventions
- Avoid waveform or seismograph forms

The glyph is a verdict surface, not an evidence surface.

---

## Article B-XIX — Invocation Law

The Summary Glyph is permitted to invoke the Balance Instrument.

Invocation may:
- open the instrument
- focus default projection states
- preserve last viewed dichotomy index (non-canonical UI memory)

Invocation may not:
- alter canonical balance state
- alter derivation thresholds
- alter dichotomy membership

---

## Article B-XX — Drift Prevention Law

Any discrepancy between:
- the Volumetric Context Layer state at t0
and
- the Summary Glyph derived at t0
constitutes derivation drift.

Derivation drift MUST be corrected by promotion, never by ad-hoc UI adjustment.

---

## Canonical Summary

- The instrument defines reality
- The glyph compresses reality at t0
- Quantization is fixed
- Direction is structural, not symbolic
- Volatility is optional and non-historical in display
