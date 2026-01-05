import { isRecruitDiscoveryDnDPayload, type RecruitDiscoveryDnDPayload } from "@/app/lib/recruiting/discoveryDnD";

export function parseRecruitingDnDPayload(e: DragEvent | React.DragEvent): RecruitDiscoveryDnDPayload | null {
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
    return null;
  } catch {
    return null;
  }
}
