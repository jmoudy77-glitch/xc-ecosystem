"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type KernelUpsertTeamRosterScholarshipInput = {
  programId: string;
  teamRosterId: string;
  actorUserId: string;
  scholarshipUnit: "percent" | "equivalency" | "amount" | string;
  scholarshipAmount: number;
  scholarshipNotes?: string | null;
  sourceSystem?: string;
  causality?: Record<string, any> | null;
  payload?: Record<string, any> | null;
};

type KernelUpsertTeamRosterScholarshipResult = {
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

export async function kernelUpsertTeamRosterScholarship(
  input: KernelUpsertTeamRosterScholarshipInput
): Promise<KernelUpsertTeamRosterScholarshipResult> {
  const supabase = getSupabaseServerClient();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) {
    throw new Error("Unauthorized");
  }

  const params = {
    p_program_id: input.programId,
    p_team_roster_id: input.teamRosterId,
    p_actor_user_id: input.actorUserId,
    p_scholarship_unit: input.scholarshipUnit,
    p_scholarship_amount: input.scholarshipAmount,
    p_scholarship_notes: input.scholarshipNotes ?? null,
    p_source_system: input.sourceSystem ?? "rpc",
    p_causality: input.causality ?? {},
    p_payload: input.payload ?? {},
  };

  const { data, error } = await supabase.rpc(
    "kernel_upsert_team_roster_scholarship",
    params
  );

  if (error) {
    throw new Error(`kernel_upsert_team_roster_scholarship failed: ${error.message}`);
  }

  const canonicalEventId = (data as string | undefined) ?? undefined;

  if (!canonicalEventId) {
    throw new Error("kernel_upsert_team_roster_scholarship returned empty id");
  }

  return { canonicalEventId };
}
