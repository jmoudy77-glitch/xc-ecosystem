"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type KernelEmitAiOutputInput = {
  programId: string;
  scopeType: string;
  scopeId: string;
  actorUserId: string;
  modelVersion: string;
  tier: number;
  inputsFingerprint: string;
  driversJson?: Record<string, any> | null;
  confidence?: number | null;
  dataLineage?: Record<string, any> | null;
  outputJson?: Record<string, any> | null;
  sourceSystem?: string;
  causality?: Record<string, any> | null;
  payload?: Record<string, any> | null;
};

type KernelEmitAiOutputResult = {
  canonicalEventId: string;
};

function getSupabaseServerClient() {
  const cookieStore = cookies() as any;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );
}

export async function kernelEmitAiOutput(
  input: KernelEmitAiOutputInput
): Promise<KernelEmitAiOutputResult> {
  const supabase = getSupabaseServerClient();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) {
    throw new Error("Unauthorized");
  }

  const params = {
    p_program_id: input.programId,
    p_scope_type: input.scopeType,
    p_scope_id: input.scopeId,
    p_actor_user_id: input.actorUserId,
    p_model_version: input.modelVersion,
    p_tier: input.tier,
    p_inputs_fingerprint: input.inputsFingerprint,
    p_drivers_json: input.driversJson ?? {},
    p_confidence: input.confidence ?? null,
    p_data_lineage: input.dataLineage ?? {},
    p_output_json: input.outputJson ?? {},
    p_source_system: input.sourceSystem ?? "rpc",
    p_causality: input.causality ?? {},
    p_payload: input.payload ?? {},
  };

  const { data, error } = await supabase.rpc("kernel_emit_ai_output", params);

  if (error) {
    throw new Error(`kernel_emit_ai_output failed: ${error.message}`);
  }

  const canonicalEventId = (data as string | undefined) ?? undefined;

  if (!canonicalEventId) {
    throw new Error("kernel_emit_ai_output returned empty id");
  }

  return { canonicalEventId };
}
