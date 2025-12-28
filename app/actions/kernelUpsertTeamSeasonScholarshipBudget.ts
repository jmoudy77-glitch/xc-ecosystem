"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type KernelUpsertTeamSeasonScholarshipBudgetInput = {
  programId: string;
  teamSeasonId: string;
  actorUserId: string;
  budgetEquivalents: number;
  budgetAmount: number;
  currency?: string | null;
  sourceSystem?: string;
  causality?: Record<string, any> | null;
  payload?: Record<string, any> | null;
};

type KernelUpsertTeamSeasonScholarshipBudgetResult = {
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

export async function kernelUpsertTeamSeasonScholarshipBudget(
  input: KernelUpsertTeamSeasonScholarshipBudgetInput
): Promise<KernelUpsertTeamSeasonScholarshipBudgetResult> {
  const supabase = getSupabaseServerClient();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) {
    throw new Error("Unauthorized");
  }

  const params = {
    p_program_id: input.programId,
    p_team_season_id: input.teamSeasonId,
    p_actor_user_id: input.actorUserId,
    p_budget_equivalents: input.budgetEquivalents,
    p_budget_amount: input.budgetAmount,
    p_currency: input.currency ?? "USD",
    p_source_system: input.sourceSystem ?? "rpc",
    p_causality: input.causality ?? {},
    p_payload: input.payload ?? {},
  };

  const { data, error } = await supabase.rpc(
    "kernel_upsert_team_season_scholarship_budget",
    params
  );

  if (error) {
    throw new Error(
      `kernel_upsert_team_season_scholarship_budget failed: ${error.message}`
    );
  }

  const canonicalEventId = (data as string | undefined) ?? undefined;

  if (!canonicalEventId) {
    throw new Error("kernel_upsert_team_season_scholarship_budget returned empty id");
  }

  return { canonicalEventId };
}
