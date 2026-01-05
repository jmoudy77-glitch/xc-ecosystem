"use server";

import { createSupabaseServerClient } from "@/app/lib/supabaseServer";

type Input = {
  programId: string;
  horizon?: string | null;
};

/**
 * A2 is read-only and non-authoritative.
 * This action is a stable seam: it can be swapped to the true A2 composition later
 * without refactoring the UI toggle contract.
 */
export async function readProgramHealthA2View(input: Input): Promise<any> {
  const supabase = await createSupabaseServerClient();

  // Best-effort: call the existing A2 composition RPC if present in the DB.
  // If it doesn't exist, return null so UI can degrade safely.
  const { data, error } = await supabase.rpc("program_health_a2_sandbox_read", {
    p_program_id: input.programId,
    p_horizon: input.horizon ?? null,
  });

  if (error) return null;
  return data ?? null;
}
