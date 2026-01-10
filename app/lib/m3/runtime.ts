import type { SupabaseClient } from "@supabase/supabase-js";

export type M3RuntimeMode = "inactive" | "active_unavailable" | "active_available";

export type M3RuntimeState = {
  programId: string;
  runtimeKey: "recruiting_m3";
  isActive: boolean;
  eligibility: {
    status: "eligible" | "ineligible" | "unknown";
    reasonCodes: string[];
    computedAt: string | null;
  };
  mode: M3RuntimeMode;
};

async function resolveProgramId(
  supabase: SupabaseClient,
  params: { programId?: string | null; teamId?: string | null }
): Promise<string> {
  const { programId, teamId } = params;

  if (programId) return programId;

  if (!teamId) {
    throw new Error("Missing required query param: programId or teamId");
  }

  const { data, error } = await supabase
    .from("teams")
    .select("program_id")
    .eq("id", teamId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.program_id) throw new Error("Team not found or missing program_id");

  return data.program_id;
}

export async function readM3RuntimeState(
  supabase: SupabaseClient,
  params: { programId?: string | null; teamId?: string | null }
): Promise<M3RuntimeState> {
  const programId = await resolveProgramId(supabase, params);

  const { data: flag, error: flagErr } = await supabase
    .from("system_runtime_flags")
    .select("is_active")
    .eq("runtime_key", "recruiting_m3")
    .maybeSingle();

  if (flagErr) throw flagErr;

  const isActive = Boolean(flag?.is_active);

  const { data: elig, error: eligErr } = await supabase
    .from("recruiting_m3_program_eligibility")
    .select("status, reason_codes, computed_at")
    .eq("program_id", programId)
    .maybeSingle();

  if (eligErr) throw eligErr;

  const statusRaw = elig?.status ?? "unknown";
  const status =
    statusRaw === "eligible" || statusRaw === "ineligible" || statusRaw === "unknown"
      ? statusRaw
      : "unknown";

  const reasonCodes = Array.isArray(elig?.reason_codes) ? elig!.reason_codes : [];
  const computedAt = elig?.computed_at ?? null;

  const mode: M3RuntimeMode = !isActive
    ? "inactive"
    : status === "eligible"
      ? "active_available"
      : "active_unavailable";

  return {
    programId,
    runtimeKey: "recruiting_m3",
    isActive,
    eligibility: { status, reasonCodes, computedAt },
    mode,
  };
}

export async function readRecruitingM3Impacts(
  supabase: SupabaseClient,
  params: { programId?: string | null; teamId?: string | null; horizon?: string | null }
): Promise<{
  state: M3RuntimeState;
  impacts: Array<{
    id: string;
    program_id: string;
    recruit_id: string;
    capability_node_id: string;
    horizon: string;
    impact_score: number;
    cohort_tier: number;
    rationale: string;
    inputs_hash: string;
    created_at: string;
  }>;
}> {
  const state = await readM3RuntimeState(supabase, params);

  if (state.mode !== "active_available") {
    return { state, impacts: [] };
  }

  const horizon = params.horizon ?? null;

  let q = supabase
    .from("recruiting_candidate_impacts")
    .select(
      "id, program_id, recruit_id, capability_node_id, horizon, impact_score, cohort_tier, rationale, inputs_hash, created_at"
    )
    .eq("program_id", state.programId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (horizon) q = q.eq("horizon", horizon);

  const { data, error } = await q;

  if (error) throw error;

  return { state, impacts: (data ?? []) as any };
}
