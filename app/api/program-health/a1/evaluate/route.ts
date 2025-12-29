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
 * Security:
 * - INTERNAL ONLY. Requires X-XC-KERNEL-SECRET header to match env PROGRAM_HEALTH_EVAL_SECRET.
 * - Uses SUPABASE_SERVICE_ROLE_KEY server-side to ensure deterministic job execution.
 *
 * Required env:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - PROGRAM_HEALTH_EVAL_SECRET
 */
function requireInternalSecret(req: Request) {
  const expected = process.env.PROGRAM_HEALTH_EVAL_SECRET;
  if (!expected) {
    throw new Error('Missing env: PROGRAM_HEALTH_EVAL_SECRET');
  }

  const provided = req.headers.get('x-xc-kernel-secret') || req.headers.get('X-XC-KERNEL-SECRET');
  if (!provided || provided !== expected) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}

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
  const unauthorized = requireInternalSecret(req);
  if (unauthorized) return unauthorized;

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
