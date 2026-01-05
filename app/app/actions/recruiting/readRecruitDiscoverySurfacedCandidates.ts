"use server";

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
  // Reserved for future deterministic scoping; not assumed/used yet.
  eventGroup?: string | null;
};

export async function readRecruitDiscoverySurfacedCandidates(
  _input: ReadRecruitDiscoverySurfacedCandidatesInput
): Promise<RecruitDiscoveryCandidate[]> {
  // Canonical sourcing is intentionally NOT assumed here.
  // This action is the stable integration seam for later wiring to:
  // - RPC / view / provider feeds
  // - deterministic filters
  // - origin metadata enrichment
  return [];
}
