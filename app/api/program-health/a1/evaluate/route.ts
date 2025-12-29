import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type A1Horizon = 'H0' | 'H1' | 'H2' | 'H3';
type Sport = 'xc' | 'tf';

interface A1EmitArgs {
  programId: string;
  sport: Sport;
  horizon: A1Horizon;
  inputsHash: string;
  resultPayload: Record<string, any>;
  scopeId?: string | null;
  engineVersion?: string;
}

/**
 * Sovereign rule:
 * This route emits A1 evaluation through Kernel RPC only.
 *
 * Write path:
 *   API route → kernel_program_health_a1_emit → canonical_events → program_health_ledger → derived tables
 *
 * NOTE:
 * This route uses SERVICE_ROLE to enable deterministic local smoke-testing and job execution
 * without relying on browser/session cookies or auth-helper exports.
 *
 * Required env:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */
function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL');
  if (!serviceKey) throw new Error('Missing env: SUPABASE_SERVICE_ROLE_KEY');

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as A1EmitArgs;

    if (!body?.programId) throw new Error('programId is required');
    if (!body?.inputsHash) throw new Error('inputsHash is required');
    if (!body?.resultPayload) throw new Error('resultPayload is required');

    const supabase = getServiceSupabase();

    const { data, error } = await supabase.rpc('kernel_program_health_a1_emit', {
      p_program_id: body.programId,
      p_sport: body.sport,
      p_horizon: body.horizon,
      p_inputs_hash: body.inputsHash,
      p_result_payload: body.resultPayload,
      p_engine_version: body.engineVersion ?? 'a1_v1',
      p_scope_id: body.scopeId ?? null,
      p_actor_user_id: null,
    });

    if (error) {
      throw new Error(`kernel_program_health_a1_emit failed: ${error.message}`);
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.canonical_event_id || !row?.ledger_id) {
      throw new Error('kernel_program_health_a1_emit returned an unexpected shape');
    }

    return NextResponse.json({
      ok: true,
      result: {
        canonicalEventId: row.canonical_event_id,
        ledgerId: row.ledger_id,
        absencesUpserted: Number(row.absences_upserted ?? 0),
        snapshotWritten: Boolean(row.snapshot_written),
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'Unknown error' },
      { status: 400 }
    );
  }
}
