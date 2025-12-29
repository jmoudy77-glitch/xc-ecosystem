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
 */
function getSupabaseSSR() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing Supabase env vars');
  }

  const cookieStore = cookies() as any;

  return createServerClient(supabaseUrl, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set() {},
      remove() {},
    },
  });
}

export async function emitProgramHealthA1User(args: A1UserEmitArgs): Promise<A1UserEmitResult> {
  const supabase = getSupabaseSSR();

  const { data: auth } = await supabase.auth.getUser();
  const actorUserId = auth?.user?.id;
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

  if (error) throw new Error(error.message);

  const row = Array.isArray(data) ? data[0] : data;

  return {
    canonicalEventId: row.canonical_event_id,
    ledgerId: row.ledger_id,
    absencesUpserted: Number(row.absences_upserted),
    snapshotWritten: Boolean(row.snapshot_written),
  };
}
