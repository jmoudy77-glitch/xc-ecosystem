import type { ProgramHealthAbsence } from "./types";

export function extractCapabilityNodeId(absence: ProgramHealthAbsence): string | null {
  const d: any = absence.details ?? {};
  return (
    d.capability_node_id ??
    d.capabilityNodeId ??
    d.capabilityNodeID ??
    d.node_id ??
    d.nodeId ??
    null
  );
}
