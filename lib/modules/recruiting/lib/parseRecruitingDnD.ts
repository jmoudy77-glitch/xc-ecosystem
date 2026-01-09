// app/lib/recruiting/parseRecruitingDnD.ts

import { isRecruitDiscoveryDnDPayload, type RecruitDiscoveryDnDPayload } from "@/app/lib/recruiting/portalDnD";

type RecruitStabilizationDnDPayload = {
  kind: "recruit_stabilization_candidate";
  programId: string;
  athleteId: string;
  displayName: string;
  eventGroup: string | null;
  gradYear: number | null;
  originKey: "surfaced" | "favorites";
  originMeta: Record<string, unknown>;
};

export function parseRecruitingDnDPayload(
  e: DragEvent | React.DragEvent
): RecruitDiscoveryDnDPayload | RecruitStabilizationDnDPayload | null {
  const dt = (e as any)?.dataTransfer;
  if (!dt) return null;

  const raw =
    dt.getData?.("application/x-xcsys-recruiting") ||
    dt.getData?.("text/plain") ||
    "";

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (isRecruitDiscoveryDnDPayload(parsed)) return parsed;
    if (parsed?.kind === "recruit_stabilization_candidate") return parsed as RecruitStabilizationDnDPayload;
    return null;
  } catch {
    return null;
  }
}
