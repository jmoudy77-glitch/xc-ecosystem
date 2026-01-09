"use server";

import { readRecruitDiscoverySurfacedCandidates as _readRecruitDiscoverySurfacedCandidates } from "@/lib/modules/recruiting/actions/readRecruitDiscoverySurfacedCandidates";

export async function readRecruitDiscoverySurfacedCandidates(
  ...args: Parameters<typeof _readRecruitDiscoverySurfacedCandidates>
) {
  return _readRecruitDiscoverySurfacedCandidates(...args);
}
