'use server';

import { cookies } from 'next/headers';

/**
 * Governing rule:
 * Program Health A1 evaluation writes MUST flow through the Kernel RPC:
 *   Server Action / Cron / UI → kernel_program_health_a1_emit → canonical_events → program_health_ledger → derived tables
 *
 * This action is the sole authorized write-entry for A1 evaluation emission.
 *
 * Notes:
 * - This action does NOT implement A1 evaluation logic.
 * - It accepts a deterministic inputs_hash and the computed result_payload produced by your A1 engine.
 * - The Kernel RPC enforces the canonical_event + single-ledger invariant and performs derived writes.
 */

export type A1Horizon = 'H0' | 'H1' | 'H2' | 'H3';
export type Sport = 'xc' | 'tf';

export interface A1EmitArgs {
  programId: string;
  sport: Sport;
  horizon: A1Horizon;

  /**
   * Determinism key: stable hash of the evaluation inputs used by the A1 engine.
   * Required by kernel_program_health_a1_emit.
   */
  inputsHash: string;

  /**
   * Full structured outputs. Recommended shape:
   * {
   *   "summary": { ... },
   *   "absences": [
   *     { "absence_key": "...", "absence_type": "...", "severity": "...", "details": { ... } }
   *   ]
   * }
   */
  resultPayload: Record<string, any>;

  /**
   * Optional scoping. Use if your A1 evaluation is bound to a team/season scope.
   */
  scopeId?: string | null;

  /**
   * Optional override; defaults to 'a1_v1' in the RPC.
   */
  engineVersion?: string;
}

export interface A1EmitResult {
  canonicalEventId: string;
  ledgerId: string;
  absencesUpserted: number;
  snapshotWritten: boolean;
}

/**
 * IMPORTANT:
 * This project has an established working pattern for reading cookies in Server Components / Server Actions:
 *   const cookieStore = cookies() as any;
 *   cookieStore.get(name)?.value
 *
 * Keep this pattern to avoid recurring TS `.get` typing issues.
 */
function getCookieValue(name: string): string | undefined {
  const cookieStore = cookies() as any;
  return cookieStore.get(name)?.value as string | undefined;
}

/**
 * Create a Supabase client suitable for server actions.
 *
 * This file intentionally uses a minimal, dependency-light approach. If your repo already has a
 * canonical server client helper (recommended), swap this implementation to import it instead.
 */
async function createSupabaseServerClient() {
  // Prefer your existing server helper if present in the repo (e.g. "@/lib/supabase/server").
  // Otherwise, fall back to @supabase/ssr.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createServerClient } = require('@supabase/ssr');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  // Minimal cookie adapter for @supabase/ssr
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return getCookieValue(name);
      },
      set() {
        // Server Actions should not mutate auth cookies in this pathway.
        // If your auth flow requires it, move to a shared helper that supports set/remove.
      },
      remove() {
        // See note above.
      },
    },
  });
}

export async function emitProgramHealthA1Evaluation(args: A1EmitArgs): Promise<A1EmitResult> {
  const {
    programId,
    sport,
    horizon,
    inputsHash,
    resultPayload,
    scopeId = null,
    engineVersion,
  } = args;

  if (!programId) throw new Error('programId is required');
  if (!inputsHash) throw new Error('inputsHash is required');
  if (!resultPayload) throw new Error('resultPayload is required');

  // Actor binding (best-effort):
  // - If you maintain actor_user_id elsewhere in your action stack, pass it explicitly.
  // - Otherwise, we attempt to derive it from the auth session.
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const actorUserId = auth?.user?.id ?? null;

  const { data, error } = await supabase.rpc('kernel_program_health_a1_emit', {
    p_program_id: programId,
    p_sport: sport,
    p_horizon: horizon,
    p_inputs_hash: inputsHash,
    p_result_payload: resultPayload,
    p_engine_version: engineVersion ?? 'a1_v1',
    p_scope_id: scopeId,
    p_actor_user_id: actorUserId,
  });

  if (error) {
    throw new Error(`kernel_program_health_a1_emit failed: ${error.message}`);
  }

  // RPC returns a TABLE (array). We normalize to a single result.
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.canonical_event_id || !row?.ledger_id) {
    throw new Error('kernel_program_health_a1_emit returned an unexpected shape');
  }

  return {
    canonicalEventId: row.canonical_event_id,
    ledgerId: row.ledger_id,
    absencesUpserted: Number(row.absences_upserted ?? 0),
    snapshotWritten: Boolean(row.snapshot_written),
  };
}
