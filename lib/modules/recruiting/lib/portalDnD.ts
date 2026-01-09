// app/lib/recruiting/portalDnD.ts

export type RecruitDiscoveryOriginKey = "surfaced" | "favorites";

export type RecruitDiscoveryDnDPayload = {
  kind: "recruit_discovery_candidate";
  programId: string;

  candidateId: string;
  displayName: string;
  eventGroup: string | null;
  gradYear: number | null;

  originKey: RecruitDiscoveryOriginKey;
  originMeta: Record<string, unknown>;
};

export function isRecruitDiscoveryDnDPayload(v: unknown): v is RecruitDiscoveryDnDPayload {
  const o = v as any;
  return (
    !!o &&
    typeof o === "object" &&
    o.kind === "recruit_discovery_candidate" &&
    typeof o.programId === "string" &&
    typeof o.candidateId === "string" &&
    typeof o.displayName === "string" &&
    (o.eventGroup === null || typeof o.eventGroup === "string") &&
    (o.gradYear === null || typeof o.gradYear === "number") &&
    (o.originKey === "surfaced" || o.originKey === "favorites") &&
    typeof o.originMeta === "object"
  );
}
