// /lib/performance/strainAccumulator.ts

export type Pole = "A" | "B";
export type StrainTarget = Pole | "both" | null;

export type DistributionSample = {
  /** epoch milliseconds */
  t: number;
  /**
   * Signed distribution position.
   * -1.0 = fully toward B
   *  0.0 = centered
   * +1.0 = fully toward A
   */
  x: number;
};

export type EquilibriumPanelState =
  | "equilibrium"
  | "out_of_equilibrium"
  | "returning_to_equilibrium";

export type StrainAccumulatorConfig = {
  /**
   * Equilibrium band half-width in the same unit as x (typically 0..1).
   * Example: 0.12 means [-0.12, +0.12] is inside band.
   */
  band: number;

  /** Minimum continuous time outside band before strain can activate. */
  minActivationMs: number;

  /** Minimum continuous time inside band before decay begins. */
  minRecoveryMs: number;

  /**
   * Accumulation rate per millisecond at full distance (|x|-band == 1.0).
   * Typically small. Example: 1 / (12 * 60 * 60 * 1000)  // 12 hours to reach max at full distance
   */
  accumulatePerMs: number;

  /**
   * Decay rate per millisecond.
   * Must be slower than accumulatePerMs (per spec).
   */
  decayPerMs: number;

  /** Clamp upper bound for strain. Typically 1.0. */
  maxStrain: number;

  /**
   * Optional: prevent “strain ping-pong” under oscillation by requiring
   * dominance persistence before targeting flips.
   */
  minDominanceMs: number;
};

export type StrainAccumulatorState = {
  /** Current strain intensity [0..maxStrain] */
  strain: number;

  /** Which side receives strain (opposite of dominant distribution). */
  target: StrainTarget;

  /** Current dominant pole (based on x sign) once dominance persistence is met. */
  dominant: Pole | null;

  /** Tracking: continuous ms outside equilibrium band */
  outsideMs: number;

  /** Tracking: continuous ms inside equilibrium band */
  insideMs: number;

  /** Tracking: continuous ms of current dominance sign */
  dominanceMs: number;

  /** Tracking: current dominance sign based on x */
  dominanceSign: Pole | null;

  /** Panel state is based on distribution only (not strain). */
  panel: EquilibriumPanelState;

  /** Last sample time processed (epoch ms). */
  lastT: number | null;
};

export const defaultStrainAccumulatorConfig: StrainAccumulatorConfig = {
  band: 0.12,
  minActivationMs: 5 * 60 * 1000, // 5 min
  minRecoveryMs: 10 * 60 * 1000, // 10 min
  accumulatePerMs: 1 / (12 * 60 * 60 * 1000), // ~12h to max at full distance
  decayPerMs: 1 / (24 * 60 * 60 * 1000), // ~24h to decay at full distance
  maxStrain: 1,
  minDominanceMs: 3 * 60 * 1000, // 3 min
};

export function initStrainState(nowT?: number): StrainAccumulatorState {
  return {
    strain: 0,
    target: null,
    dominant: null,
    outsideMs: 0,
    insideMs: 0,
    dominanceMs: 0,
    dominanceSign: null,
    panel: "equilibrium",
    lastT: nowT ?? null,
  };
}

/**
 * Update accumulator with one new distribution sample.
 * This is temporal and requires monotonic t.
 */
export function stepStrainAccumulator(
  prev: StrainAccumulatorState,
  sample: DistributionSample,
  cfg: StrainAccumulatorConfig = defaultStrainAccumulatorConfig
): StrainAccumulatorState {
  const t = sample.t;
  const x = clamp(sample.x, -1, 1);

  const dt =
    prev.lastT == null ? 0 : Math.max(0, t - prev.lastT);

  const insideBand = Math.abs(x) <= cfg.band;
  const sign: Pole | null = x > 0 ? "A" : x < 0 ? "B" : null;

  // Panel state (distribution-only)
  const panel: EquilibriumPanelState = insideBand
    ? prev.panel === "out_of_equilibrium" || prev.panel === "returning_to_equilibrium"
      ? "returning_to_equilibrium"
      : "equilibrium"
    : "out_of_equilibrium";

  // Track inside/outside band continuity
  let outsideMs = prev.outsideMs;
  let insideMs = prev.insideMs;

  if (insideBand) {
    insideMs = prev.insideMs + dt;
    outsideMs = 0;
  } else {
    outsideMs = prev.outsideMs + dt;
    insideMs = 0;
  }

  // Track dominance persistence (prevents ping-pong targeting)
  let dominanceSign = prev.dominanceSign;
  let dominanceMs = prev.dominanceMs;

  if (sign == null) {
    dominanceSign = null;
    dominanceMs = 0;
  } else if (dominanceSign === sign) {
    dominanceMs = dominanceMs + dt;
  } else {
    dominanceSign = sign;
    dominanceMs = dt;
  }

  const dominant: Pole | null =
    dominanceSign && dominanceMs >= cfg.minDominanceMs ? dominanceSign : prev.dominant;

  // Determine strain target (opposite of dominant distribution)
  // If we don't yet have stable dominance, keep previous target.
  let target: StrainTarget = prev.target;
  if (dominant === "A") target = "B";
  if (dominant === "B") target = "A";
  if (dominant == null) target = prev.target ?? null;

  // Accumulate or decay strain
  let strain = prev.strain;

  if (!insideBand) {
    // Outside band: only accumulate after activation window
    if (outsideMs >= cfg.minActivationMs) {
      // distance outside band in [0..1]
      const dist = clamp(Math.abs(x) - cfg.band, 0, 1);
      const delta = dist * cfg.accumulatePerMs * dt;
      strain = clamp(strain + delta, 0, cfg.maxStrain);
    }
  } else {
    // Inside band: decay only after sustained recovery window
    if (insideMs >= cfg.minRecoveryMs) {
      // decay scaled slightly by how close to center we are (optional)
      const centerFactor = 1 - clamp(Math.abs(x) / cfg.band, 0, 1); // 1 near center, 0 near edge
      const delta = (0.5 + 0.5 * centerFactor) * cfg.decayPerMs * dt;
      strain = clamp(strain - delta, 0, cfg.maxStrain);

      // If fully recovered, clear targeting
      if (strain === 0) target = null;
    }
  }

  return {
    ...prev,
    strain,
    target,
    dominant,
    outsideMs,
    insideMs,
    dominanceMs,
    dominanceSign,
    panel,
    lastT: t,
  };
}

/**
 * Convenience: process an ordered series and return the final state.
 * Requires samples sorted by ascending t.
 */
export function runStrainAccumulator(
  samples: DistributionSample[],
  cfg: StrainAccumulatorConfig = defaultStrainAccumulatorConfig,
  seed?: StrainAccumulatorState
): StrainAccumulatorState {
  let state = seed ?? initStrainState(samples[0]?.t);
  for (const s of samples) {
    state = stepStrainAccumulator(state, s, cfg);
  }
  return state;
}

/**
 * Compute a stable “heat” value to render on the strain layer.
 * Returned intensity is [0..1] regardless of cfg.maxStrain.
 */
export function strainToHeat01(
  strain: number,
  cfg: StrainAccumulatorConfig = defaultStrainAccumulatorConfig
): number {
  const s = cfg.maxStrain > 0 ? clamp(strain / cfg.maxStrain, 0, 1) : 0;

  // Nonlinear curve so low strain is subtle and high strain is expressive.
  // Keep conservative: avoid early alarm.
  return clamp(Math.pow(s, 1.6), 0, 1);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}