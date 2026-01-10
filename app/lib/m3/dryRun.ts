import type { SupabaseClient } from "@supabase/supabase-js";
import { readM3RuntimeState, type M3RuntimeState } from "@/app/lib/m3/runtime";
import { buildM3InputsHash } from "@/app/lib/m3/hash";
import { logM3Provenance } from "@/app/lib/m3/provenance";

export type M3DryRunReport = {
  ok: boolean;
  scope: {
    programId: string;
    teamId: string | null;
    horizon: string | null;
  };
  runtime: M3RuntimeState;
  counts: {
    absencesCount: number;
    recruitsCount: number;
  };
  plan: {
    wouldCompute: boolean;
    wouldPersist: false;
    reasonCodes: string[];
    inputsHash: string;
    modelVersion: string;
  };
  invariants: {
    noPersistence: true;
    noProgramHealthMutation: true;
  };
  generatedAt: string;
};

async function countAbsences(
  supabase: SupabaseClient,
  programId: string
): Promise<number> {
  // Read-only: PH sovereign table/view. This does not mutate PH.
  const { count, error } = await supabase
    .from("absence_determinations")
    .select("id", { count: "exact", head: true })
    .eq("program_id", programId);

  if (error) throw error;
  return count ?? 0;
}

async function countProgramRecruits(
  supabase: SupabaseClient,
  programId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("program_recruits")
    .select("id", { count: "exact", head: true })
    .eq("program_id", programId);

  if (error) throw error;
  return count ?? 0;
}

export async function runM3DryRun(params: {
  supabase: SupabaseClient;
  programId?: string | null;
  teamId?: string | null;
  horizon?: string | null;
}): Promise<M3DryRunReport> {
  const state = await readM3RuntimeState(params.supabase, {
    programId: params.programId ?? null,
    teamId: params.teamId ?? null,
  });

  const programId = state.programId;

  const [absencesCount, recruitsCount] = await Promise.all([
    countAbsences(params.supabase, programId),
    countProgramRecruits(params.supabase, programId),
  ]);

  const reasonCodes: string[] = [];

  // Dry-run can execute regardless of activation, but compute must not occur unless active+eligible.
  if (!state.isActive) reasonCodes.push("RUNTIME_INACTIVE");
  if (state.eligibility.status !== "eligible") reasonCodes.push("PROGRAM_NOT_ELIGIBLE");

  // We treat "wouldCompute" as a truthful preview of whether compute WOULD be allowed right now.
  const wouldCompute = state.isActive && state.eligibility.status === "eligible";

  // Additional guardrails for meaningful preview
  if (absencesCount <= 0) reasonCodes.push("NO_RECRUITABLE_ABSENCES");
  if (recruitsCount <= 0) reasonCodes.push("NO_PROGRAM_RECRUITS");

  const modelVersion = "m3_dry_run_v3";
  const inputsHash = buildM3InputsHash({
    modelVersion,
    programId,
    teamId: params.teamId ?? null,
    horizon: params.horizon ?? null,
    counts: { absencesCount, recruitsCount },
    linkage: { recruitsLinkage: "program_recruits(program_id -> recruit_id)" },
    runtime: {
      isActive: state.isActive,
      eligibility: state.eligibility.status,
    },
  });

  logM3Provenance({
    modelVersion,
    inputsHash,
    programId,
    generatedAt: new Date().toISOString(),
    notes: reasonCodes,
  });

  return {
    ok: true,
    scope: {
      programId,
      teamId: params.teamId ?? null,
      horizon: params.horizon ?? null,
    },
    runtime: state,
    counts: { absencesCount, recruitsCount },
    plan: {
      wouldCompute,
      wouldPersist: false,
      reasonCodes,
      inputsHash,
      modelVersion,
    },
    invariants: {
      noPersistence: true,
      noProgramHealthMutation: true,
    },
    generatedAt: new Date().toISOString(),
  };
}
