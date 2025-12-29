import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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
 * Actor-bound UI path via Route Handler.
 *
 * Rationale:
 * - Next.js cookies() API surface differs across contexts in this repo/runtime.
 * - Using raw Cookie header avoids depending on cookieStore.get/getAll.
 *
 * This route:
 * - derives actor_user_id from the authenticated Supabase session (if present)
 * - emits A1 evaluation strictly through kernel_program_health_a1_emit
 */
function parseCookieHeader(headerValue: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headerValue) return out;

  for (const part of headerValue.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (!k) continue;
    out[k] = decodeURIComponent(v);
  }
  return out;
}

function getSupabaseFromRequest(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  const cookieHeader = req.headers.get('cookie');
  const cookieMap = parseCookieHeader(cookieHeader);

  return createServerClient(supabaseUrl, anonKey, {
    cookies: {
      get(name: string) {
        return cookieMap[name];
      },
      set() {
        // no-op for this route; auth cookie mutation not required for reading session
      },
      remove() {
        // no-op
      },
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as A1EmitArgs;

    if (!body?.programId) throw new Error('programId is required');
    if (!body?.inputsHash) throw new Error('inputsHash is required');
    if (!body?.resultPayload) throw new Error('resultPayload is required');

    const supabase = getSupabaseFromRequest(req);

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) throw new Error(`Auth error: ${authErr.message}`);

    const actorUserId = auth?.user?.id ?? null;
    if (!actorUserId) throw new Error('Not authenticated');

    const { data, error } = await supabase.rpc('kernel_program_health_a1_emit', {
      p_program_id: body.programId,
      p_sport: body.sport,
      p_horizon: body.horizon,
      p_inputs_hash: body.inputsHash,
      p_result_payload: body.resultPayload,
      p_engine_version: body.engineVersion ?? 'a1_v1',
      p_scope_id: body.scopeId ?? null,
      p_actor_user_id: actorUserId,
    });

    if (error) throw new Error(`kernel_program_health_a1_emit failed: ${error.message}`);

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.canonical_event_id || !row?.ledger_id) {
      throw new Error('kernel_program_health_a1_emit returned unexpected shape');
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
    return NextResponse.json({ ok: false, error: e?.message ?? 'Unknown error' }, { status: 400 });
  }
}
