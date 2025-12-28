"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type KernelMergeAthleteIdentityInput = {
  programId: string;
  canonicalAthleteId: string;
  sourceAthleteId: string;
  actorUserId: string;
  details?: Record<string, any> | null;
  sourceSystem?: string;
  causality?: Record<string, any> | null;
  payload?: Record<string, any> | null;
};

type KernelMergeAthleteIdentityResult = {
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

export async function kernelMergeAthleteIdentity(
  input: KernelMergeAthleteIdentityInput
): Promise<KernelMergeAthleteIdentityResult> {
  const supabase = getSupabaseServerClient();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) {
    throw new Error("Unauthorized");
  }

  const params = {
    p_program_id: input.programId,
    p_canonical_athlete_id: input.canonicalAthleteId,
    p_source_athlete_id: input.sourceAthleteId,
    p_actor_user_id: input.actorUserId,
    p_details: input.details ?? {},
    p_source_system: input.sourceSystem ?? "rpc",
    p_causality: input.causality ?? {},
    p_payload: input.payload ?? {},
  };

  const { data, error } = await supabase.rpc("kernel_merge_athlete_identity", params);

  if (error) {
    throw new Error(`kernel_merge_athlete_identity failed: ${error.message}`);
  }

  const canonicalEventId = (data as string | undefined) ?? undefined;

  if (!canonicalEventId) {
    throw new Error("kernel_merge_athlete_identity returned empty id");
  }

  return { canonicalEventId };
}
