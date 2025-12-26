// /lib/performance/equilibriumState.ts

export type EquilibriumState =
  | "equilibrium"
  | "out_of_equilibrium"
  | "returning"
  | "out_stable"; // out, but not clearly moving (noise band)

export type EquilibriumStateInput = {
  /** Aggregate signed tension in [-1, 1] (or any normalized scale). */
  tensionNow: number;
  /** Previous aggregate signed tension (same scale). */
  tensionPrev: number;

  /** Equilibrium band around 0 (e.g. 0.12). */
  epsilon: number;
  /** Noise floor for trend delta (e.g. 0.03). */
  delta: number;

  /** Optional: if provided, we’ll hold state in the noise band. */
  prevState?: EquilibriumState;
};

export function classifyEquilibriumState(input: EquilibriumStateInput): {
  state: EquilibriumState;
  isOutOfEquilibrium: boolean;
  absNow: number;
  dAbs: number;
} {
  const { tensionNow, tensionPrev, epsilon, delta, prevState } = input;

  const absNow = Math.abs(tensionNow);
  const absPrev = Math.abs(tensionPrev);
  const dAbs = absNow - absPrev;

  // 1) Equilibrium (position only)
  if (absNow <= epsilon) {
    return { state: "equilibrium", isOutOfEquilibrium: false, absNow, dAbs };
  }

  // 2) Out / Returning (direction over time)
  if (dAbs >= delta) {
    return { state: "out_of_equilibrium", isOutOfEquilibrium: true, absNow, dAbs };
  }

  if (dAbs <= -delta) {
    return { state: "returning", isOutOfEquilibrium: true, absNow, dAbs };
  }

  // 3) Noise band: hold prior state if available, else conservative "out_stable"
  const held =
    prevState && prevState !== "equilibrium" ? prevState : "out_stable";

  return { state: held, isOutOfEquilibrium: true, absNow, dAbs };
}