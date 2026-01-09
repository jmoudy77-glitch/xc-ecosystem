# 2025-12-24 — Execution Equilibrium Visualization Normalization (Locked)

This snapshot captures the **visual normalization constraints** used to ensure that each dichotomous balance field carries a **consistent perceptual weight** across the five tensions, without altering the underlying truth used for strain accumulation.

---

## Where this lives

**File:** `// components/performance/map/ExecutionBalanceMapPanel.tsx`

Normalization is applied **only** to the prop passed into the renderer:

- `distributionX` → **normalized**
- `updateStrain(...)` → continues to receive **raw tensions** (truth layer)

---

## Constraints (locked)

### Deadband
- **Constant:** `VIZ_DEADBAND = 0.06`
- **Meaning:** Treat |tension| ≤ 0.06 as visually neutral.
- **Purpose:** Prevent micro-noise / jitter from reading as meaningful pull.

### Curve
- **Constant:** `VIZ_CURVE = 1.35`
- **Meaning:** Non-linear shaping applied after deadband rescaling.
- **Purpose:** Improve mid-range legibility while avoiding cartoonish extremes.

### Per-dichotomy gain map (reserved)
All are currently locked at unity:

```ts
const VIZ_GAIN: Record<DichotomyKey, number> = {
  training_load_vs_readiness: 1.0,
  individual_vs_team: 1.0,
  consistency_vs_adaptation: 1.0,
  discipline_vs_instinct: 1.0,
  sustainability_vs_pressure: 1.0,
};
```

- **Meaning:** Optional per-pair scaling knob to correct long-term perceptual imbalance.
- **Status:** Present but unused (all 1.0). Do not tune unless we have repeated evidence that one pair consistently reads “louder” at equal raw tension.

---

## Exact normalization function (authoritative)

```ts
function normalizeForViz(key: DichotomyKey, raw: number) {
  const x = clampTension(raw);

  // deadband
  const ax = Math.abs(x);
  if (ax <= VIZ_DEADBAND) return 0;

  // rescale remaining range to 0..1
  const t = (ax - VIZ_DEADBAND) / (1 - VIZ_DEADBAND);

  // curve response
  const shaped = Math.pow(t, VIZ_CURVE);

  // per-dichotomy gain
  const g = VIZ_GAIN[key] ?? 1;

  const out = Math.min(1, shaped * g);
  return Math.sign(x) * out;
}
```

Applied at render time:

```tsx
distributionX={normalizeForViz(DICHOTOMY_KEYS[i]!, tensions[i] ?? 0)}
```

---

## Invariants

- **Truth remains unmodified:** all logic that determines strain accumulation and equilibrium/out-of-band uses **raw tension** values.
- **Normalization is purely perceptual:** it exists only to ensure rapid, intuitive comparison across multiple simultaneous fields.
- **One job, one layer:** mapping and normalization occur in the panel, not inside `VerticalBalanceField` (renderer stays generic).

---

## When to revisit (only if)

- Coaches consistently misinterpret relative dominance across fields (perception mismatch),
- Or one dichotomy visually dominates at comparable raw tensions across multiple test datasets.

If revisiting, adjust in this order:
1) `VIZ_DEADBAND` (stability)  
2) `VIZ_CURVE` (mid-range readability)  
3) `VIZ_GAIN[key]` (pair-specific tuning; last resort)
