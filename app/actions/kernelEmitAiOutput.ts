'use server';

import { createClient } from '@/lib/supabase/route';

export type KernelEmitAiOutputArgs = {
  programId: string;
  scopeType: string;
  scopeId?: string | null;
  actorUserId?: string | null;
  modelVersion: string;
  tier: 0 | 1 | 2 | 3;
  inputsFingerprint: string;
  driversJson?: Record<string, any>;
  confidence?: number | null;
  dataLineage?: Record<string, any>;
  outputJson?: Record<string, any>;
  causality?: Record<string, any>;
  payload?: Record<string, any>;
  sourceSystem?: string;
};

export async function kernelEmitAiOutput(args: KernelEmitAiOutputArgs) {
  const supabase = await createClient();

  const {
    programId,
    scopeType,
    scopeId = null,
    actorUserId = null,
    modelVersion,
    tier,
    inputsFingerprint,
    driversJson = {},
    confidence = null,
    dataLineage = {},
    outputJson = {},
    causality = {},
    payload = {},
    sourceSystem = 'server_action',
  } = args;

  const { data, error } = await supabase.rpc('kernel_emit_ai_output', {
    p_program_id: programId,
    p_scope_type: scopeType,
    p_scope_id: scopeId,
    p_actor_user_id: actorUserId,
    p_model_version: modelVersion,
    p_tier: tier,
    p_inputs_fingerprint: inputsFingerprint,
    p_drivers_json: driversJson,
    p_confidence: confidence,
    p_data_lineage: dataLineage,
    p_output_json: outputJson,
    p_source_system: sourceSystem,
    p_causality: causality,
    p_payload: payload,
  });

  if (error) throw new Error(`kernel_emit_ai_output failed: ${error.message}`);

  return { canonicalEventId: data as string };
}
