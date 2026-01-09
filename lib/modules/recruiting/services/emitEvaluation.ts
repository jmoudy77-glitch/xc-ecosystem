export type A1Horizon = "H0" | "H1" | "H2" | "H3";
export type Sport = "xc" | "tf";

export interface RecruitingEmitArgs {
  programId: string;
  recruitId: string;
  sport: Sport;
  horizon: A1Horizon;
  inputsHash: string;
  resultPayload: Record<string, any>;
  scopeId?: string | null;
}

export async function emitEvaluation(supabase: any, body: RecruitingEmitArgs) {
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw new Error(`Auth error: ${authErr.message}`);

  const actorUserId = auth?.user?.id ?? null;
  if (!actorUserId) throw new Error("Not authenticated");

  const { data: latestA1, error: a1Err } = await supabase
    .from("canonical_events")
    .select("id")
    .eq("program_id", body.programId)
    .eq("event_type", "program_health.a1_evaluated")
    .eq("payload->>horizon", body.horizon)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (a1Err) throw new Error(`A1 lookup failed: ${a1Err.message}`);
  if (!latestA1?.id) {
    throw new Error(`No A1 canonical event found for program+horizon (${body.programId}, ${body.horizon})`);
  }

  const { data, error } = await supabase.rpc("kernel_recruiting_emit", {
    p_program_id: body.programId,
    p_recruit_id: body.recruitId,
    p_inputs_hash: body.inputsHash,
    p_result_payload: body.resultPayload,
    p_upstream_a1_canonical_event_id: latestA1.id,
    p_scope_id: body.scopeId ?? null,
    p_actor_user_id: actorUserId,
  });

  if (error) throw new Error(`kernel_recruiting_emit failed: ${error.message}`);

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.canonical_event_id || !row?.ledger_id) {
    throw new Error("kernel_recruiting_emit returned unexpected shape");
  }

  return {
    canonicalEventId: row.canonical_event_id,
    ledgerId: row.ledger_id,
    upstreamA1CanonicalEventId: latestA1.id,
  };
}
