"use server";

import { readRecruitingM1View } from "@/app/actions/recruiting/readRecruitingM1View";

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
  const { programId, eventGroup } = input;
  if (!programId) return [];

  const model = await readRecruitingM1View(programId);
  const cohorts = (model as any)?.m3?.cohorts ?? [];

  const out: RecruitDiscoveryCandidate[] = [];

  for (const row of cohorts) {
    const id =
      (typeof row?.id === "string" && row.id) ||
      (typeof row?.candidate_id === "string" && row.candidate_id) ||
      (typeof row?.athlete_id === "string" && row.athlete_id) ||
      (typeof row?.recruit_id === "string" && row.recruit_id) ||
      null;

    const displayName =
      (typeof row?.displayName === "string" && row.displayName) ||
      (typeof row?.display_name === "string" && row.display_name) ||
      (typeof row?.full_name === "string" && row.full_name) ||
      (typeof row?.name === "string" && row.name) ||
      null;

    if (!id || !displayName) continue;

    const eventGroup =
      (typeof row?.eventGroup === "string" && row.eventGroup) ||
      (typeof row?.event_group === "string" && row.event_group) ||
      null;

    if (eventGroup && typeof eventGroup === "string" && input.eventGroup) {
      if (eventGroup !== input.eventGroup) continue;
    }

    const gradYear =
      (typeof row?.gradYear === "number" && Number.isFinite(row.gradYear) && row.gradYear) ||
      (typeof row?.grad_year === "number" && Number.isFinite(row.grad_year) && row.grad_year) ||
      null;

    out.push({
      id,
      displayName,
      eventGroup,
      gradYear,
      originKey: "surfaced",
      originMeta: {
        source: "recruiting_m1_view",
      },
    });
  }

  return out;
}
