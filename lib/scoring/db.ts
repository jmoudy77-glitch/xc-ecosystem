import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  GlobalComponentScores,
  GlobalScoreResult,
  ProgramWeights,
} from "./types";
import { computeGlobalScores } from "./computeGlobal";
import { computeProgramScore } from "./computeProgramScore";

/**
 * For now, we do not have rich academic/performance/attendance
 * metrics in the schema. This function provides a placeholder
 * mapping from an athlete row to component scores so that the
 * scoring pipeline is wired end-to-end.
 *
 * As you add more fields (GPA, test scores, PRs, attendance logs,
 * reprimands, etc.), update this mapping.
 */
function deriveComponentsFromAthleteRow(row: any): GlobalComponentScores {
  // Very conservative defaults for now.
  // You can tweak these heuristics later.
  const base: GlobalComponentScores = {
    academic: 50,
    performance: 50,
    availability: 50,
    conduct: 50,
  };

  // Example: nudge academic by grad year proximity (you can remove or change this).
  if (typeof row.grad_year === "number") {
    const currentYear = new Date().getFullYear();
    const yearsToGrad = row.grad_year - currentYear;
    // Slight boost if closer to graduation (arbitrary heuristic for now)
    const academicBoost = Math.max(-10, Math.min(10, -yearsToGrad));
    base.academic = Math.max(0, Math.min(100, base.academic + academicBoost));
  }

  return base;
}

/**
 * Recompute global scores for all athletes and upsert into
 * public.athlete_scores.
 *
 * This uses supabaseAdmin (service role) and should only be
 * invoked from secure server routes / cron jobs.
 */
export async function recomputeGlobalAthleteScores() {
  const { data: athletes, error } = await supabaseAdmin
    .from("athletes")
    .select(
      `
      id,
      grad_year
    `
    );

  if (error) {
    console.error("[scoring] Failed to load athletes:", error);
    throw error;
  }

  if (!athletes || athletes.length === 0) {
    return { updated: 0 };
  }

  let updatedCount = 0;
  const now = new Date().toISOString();

  for (const athlete of athletes) {
    const components = deriveComponentsFromAthleteRow(athlete);
    const globalScores: GlobalScoreResult = computeGlobalScores(components);

    const { error: upsertError } = await supabaseAdmin
      .from("athlete_scores")
      .upsert(
        {
          athlete_id: athlete.id,
          academic_score: globalScores.academic,
          performance_score: globalScores.performance,
          availability_score: globalScores.availability,
          conduct_score: globalScores.conduct,
          global_overall: globalScores.global_overall,
          updated_at: now,
        },
        {
          onConflict: "athlete_id",
        }
      );

    if (upsertError) {
      console.error(
        "[scoring] Failed to upsert athlete_scores for athlete",
        athlete.id,
        upsertError
      );
      continue;
    }

    updatedCount += 1;
  }

  return { updated: updatedCount };
}

/**
 * Placeholder for program-level scoring integration. Once there is
 * a clear relationship between athletes and programs in the schema
 * (e.g. a join table or recruiting board table), we can implement
 * a similar recomputation function for program_athlete_scores.
 */
export async function recomputeProgramAthleteScoresForProgram(
  _programId: string,
  _weights: ProgramWeights
) {
  // Not implemented yet; left as a stub so the API surface is ready.
  return { updated: 0 };
}
