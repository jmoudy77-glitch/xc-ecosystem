import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

type A1Horizon = 'H0' | 'H1' | 'H2' | 'H3';
type Sport = 'xc' | 'tf';

interface RecruitingEmitArgs {
  programId: string;
  recruitId: string;
  sport: Sport;
  horizon: A1Horizon;
  inputsHash: string;
  resultPayload: Record<string, any>;
  scopeId?: string | null;
}

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
    throw new Error('Missing Supabase env vars');
  }

  const cookieHeader = req.headers.get('cookie');
  const cookieMap = parseCookieHeader(cookieHeader);

  return createServerClient(supabaseUrl, anonKey, {
    cookies: {
      get(name: string) {
        return cookieMap[name];
      },
      set() {},
      remove() {},
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RecruitingEmitArgs;

    if (!body?.programId) throw new Error('programId is required');
    if (!body?.recruitId) throw new Error('recruitId is required');
    if (!body?.inputsHash) throw new Error('inputsHash is required');
    if (!body?.resultPayload) throw new Error('resultPayload is required');

    const supabase = getSupabaseFromRequest(req);

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) throw new Error(`Auth error: ${authErr.message}`);

    const actorUserId = auth?.user?.id ?? null;
    if (!actorUserId) throw new Error('Not authenticated');

    // Resolve latest A1 canonical event for this program+horizon
    const { data: latestA1, error: a1Err } = await supabase
      .from('canonical_events')
      .select('id')
      .eq('program_id', body.programId)
      .eq('event_type', 'program_health.a1_evaluated')
      .eq('payload->>horizon', body.horizon)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (a1Err) throw new Error(`A1 lookup failed: ${a1Err.message}`);
    if (!latestA1?.id) {
      throw new Error(`No A1 canonical event found for program+horizon (${body.programId}, ${body.horizon})`);
    }

    const { data, error } = await supabase.rpc('kernel_recruiting_emit', {
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
      throw new Error('kernel_recruiting_emit returned unexpected shape');
    }

    return NextResponse.json({
      ok: true,
      result: {
        canonicalEventId: row.canonical_event_id,
        ledgerId: row.ledger_id,
        upstreamA1CanonicalEventId: latestA1.id,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Unknown error' }, { status: 400 });
  }
}
