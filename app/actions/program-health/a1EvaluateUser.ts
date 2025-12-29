'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

type A1Horizon = 'H0' | 'H1' | 'H2' | 'H3';
type Sport = 'xc' | 'tf';

export interface A1UserEmitArgs {
  programId: string;
  sport: Sport;
  horizon: A1Horizon;
  inputsHash: string;
  resultPayload: Record<string, any>;
  scopeId?: string | null;
  engineVersion?: string;
}

export interface A1UserEmitResult {
  canonicalEventId: string;
  ledgerId: string;
  absencesUpserted: number;
  snapshotWritten: boolean;
}

/**
 * Actor-bound UI path.
 * Uses Supabase SSR client bound to current user session.
 * Emits A1 evaluation strictly via kernel_program_health_a1_emit.
 *
 * IMPORTANT:
 * We do NOT assume cookies().get exists on the returned object at runtime.
 * We use the stable Next.js RequestCookies API surface:
 * - cookies().getAll()
 * - cookies().set() is not available in Server Actions the same way; we no-op set/remove.
 */
function getSupabaseSSR() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  const cookieStore = cookies();

  return createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // Server Actions should not mutate auth cookies here.
        // If your auth flow requires cookie mutation, move this to a Route Handler.
      },
    },
  });
}

export async function emitProgramHealthA1User(args: A1UserEmitArgs): Promise<A1UserEmitResult> {
  if (!args?.programId) throw new Error('programId is required');
  if (!args?.inputsHash) throw new Error('inputsHash is required');
  if (!args?.resultPayload) throw new Error('resultPayload is required');

  const supabase = getSupabaseSSR();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw new Error(`Auth error: ${authErr.message}`);

  const actorUserId = auth?.user?.id ?? null;
  if (!actorUserId) throw new Error('Not authenticated');

  const { data, error } = await supabase.rpc('kernel_program_health_a1_emit', {
    p_program_id: args.programId,
    p_sport: args.sport,
    p_horizon: args.horizon,
    p_inputs_hash: args.inputsHash,
    p_result_payload: args.resultPayload,
    p_engine_version: args.engineVersion ?? 'a1_v1',
    p_scope_id: args.scopeId ?? null,
    p_actor_user_id: actorUserId,
  });

  if (error) throw new Error(`kernel_program_health_a1_emit failed: ${error.message}`);

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.canonical_event_id || !row?.ledger_id) {
    throw new Error('kernel_program_health_a1_emit returned unexpected shape');
  }

  return {
    canonicalEventId: row.canonical_event_id,
    ledgerId: row.ledger_id,
    absencesUpserted: Number(row.absences_upserted ?? 0),
    snapshotWritten: Boolean(row.snapshot_written),
  };
}
