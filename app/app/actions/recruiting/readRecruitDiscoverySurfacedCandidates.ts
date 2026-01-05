"use server";

import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabaseServer";

export type RecruitDiscoveryOriginKey = "surfaced" | "favorites";

export type RecruitDiscoveryCandidate = {
  id: string;
  displayName: string;
  eventGroup?: string | null;
  gradYear?: number | null;
  originKey: RecruitDiscoveryOriginKey;
  originMeta: Record<string, unknown>;
};

type ReadRecruitDiscoverySurfacedCandidatesInput = {
  programId: string;
  eventGroup?: string | null;
};

export async function readRecruitDiscoverySurfacedCandidates(
  input: ReadRecruitDiscoverySurfacedCandidatesInput
): Promise<RecruitDiscoveryCandidate[]> {
  const cookieStore = await cookies();
  const { supabase } = await supabaseServer(cookieStore);

  const { programId, eventGroup } = input;

  const query = supabase
    .from("program_recruits")
    .select(
      `
      recruit_id,
      recruits (
        id,
        first_name,
        last_name,
        grad_year,
        event_group
      )
    `
    )
    .eq("program_id", programId)
    .neq("status", "archived");

  if (eventGroup) {
    query.eq("recruits.event_group", eventGroup);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data
    .map((row: any) => {
      const r = row?.recruits;
      if (!r?.id || !r?.first_name || !r?.last_name) return null;

      return {
        id: r.id,
        displayName: `${r.first_name} ${r.last_name}`,
        eventGroup: r.event_group ?? null,
        gradYear: r.grad_year ?? null,
        originKey: "surfaced",
        originMeta: {
          source: "program_recruits",
        },
      } satisfies RecruitDiscoveryCandidate;
    })
    .filter(Boolean) as RecruitDiscoveryCandidate[];
}
