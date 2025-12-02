import {
  GlobalScoreResult,
  ProgramWeights,
  ProgramScoreResult,
} from "./types";

/**
 * Compute a program-specific score from global scores and a
 * program-defined weight profile.
 */
export function computeProgramScore(
  globalScores: GlobalScoreResult,
  weights: ProgramWeights
): ProgramScoreResult {
  const clamp = (n: number) => Math.max(0, Math.min(100, n));

  const totalWeight =
    weights.academic +
    weights.performance +
    weights.availability +
    weights.conduct;

  const overall_for_program = clamp(
    (globalScores.academic * weights.academic +
      globalScores.performance * weights.performance +
      globalScores.availability * weights.availability +
      globalScores.conduct * weights.conduct) / totalWeight
  );

  return {
    overall_for_program,
    // Fit score can later incorporate program culture, geography, etc.
    fit_score_for_program: null,
  };
}
