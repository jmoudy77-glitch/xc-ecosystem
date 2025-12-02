import { GlobalComponentScores, GlobalScoreResult } from "./types";

/**
 * Compute the global score for an athlete from component scores.
 *
 * For now, this is a deterministic, non-AI formula. Later we can
 * plug in more sophisticated logic or AI assistance, but this
 * gives us a stable backbone that is easy to reason about.
 */
export function computeGlobalScores(
  components: GlobalComponentScores
): GlobalScoreResult {
  const clamp = (n: number) => Math.max(0, Math.min(100, n));

  const academic = clamp(components.academic);
  const performance = clamp(components.performance);
  const availability = clamp(components.availability);
  const conduct = clamp(components.conduct);

  // Default weight profile for the global score
  const weights = {
    academic: 0.35,
    performance: 0.4,
    availability: 0.15,
    conduct: 0.1,
  };

  const global_overall = clamp(
    academic * weights.academic +
      performance * weights.performance +
      availability * weights.availability +
      conduct * weights.conduct
  );

  return { academic, performance, availability, conduct, global_overall };
}
