"use server";

import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabaseServer";
import type {
  ProgramHealthAbsence,
  ProgramHealthCapabilityNode,
  ProgramHealthSnapshot,
  ProgramHealthViewModel,
} from "@/app/ui/program-health/types";

const HORIZONS = ["H0", "H1", "H2", "H3"] as const;
type Horizon = (typeof HORIZONS)[number];

async function readLatestSnapshotForHorizon(
  supabase: any,
  programId: string,
  horizon: Horizon
): Promise<ProgramHealthSnapshot | null> {
  const { data, error } = await supabase
    .from("program_health_snapshots")
    .select("*")
    .eq("program_id", programId)
    .eq("horizon", horizon)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  return (data?.[0] as ProgramHealthSnapshot) ?? null;
}

async function readSnapshotHistoryForHorizon(
  supabase: any,
  programId: string,
  horizon: Horizon,
  limitCount: number
): Promise<ProgramHealthSnapshot[]> {
  const { data, error } = await supabase
    .from("program_health_snapshots")
    .select("*")
    .eq("program_id", programId)
    .eq("horizon", horizon)
    .order("created_at", { ascending: false })
    .limit(limitCount);

  if (error) throw error;
  return (data as ProgramHealthSnapshot[]) ?? [];
}

/**
 * Program Health UI v1 read model.
 * Canonical read only; UI reveals runtime truth and history.
 */
export async function readProgramHealthView(programId: string): Promise<ProgramHealthViewModel> {
  const cookieStore = await cookies();
  const { supabase } = await supabaseServer(cookieStore);

  // 1) Capability structure (canonical surface)
  const { data: capabilityNodes, error: nodesErr } = await supabase
    .from("capability_nodes")
    .select("*")
    .eq("program_id", programId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (nodesErr) throw nodesErr;

  // 2) Active absences (canonical surface)
  const { data: absences, error: absErr } = await supabase
    .from("program_health_absences")
    .select("*")
    .eq("program_id", programId)
    .order("updated_at", { ascending: false });

  if (absErr) throw absErr;

  // R4_1_1: Runtime truth binding — normalize absence shape for client mapping.
  // DB canonical column: capability_node_id
  // Provide legacy alias: capabilityNodeId (some client code may still key on this)
  // Normalize severity to a number to avoid renderer suppression.
  const rawAbsences = (absences ?? []) as any[];
  const normalizedAbsences = rawAbsences.map((a) => {
    const details = (a.details ?? {}) as Record<string, unknown>;
    const capabilityNodeId =
      a.capability_node_id ??
      a.capabilityNodeId ??
      (details as any).capability_node_id ??
      (details as any).capabilityNodeId ??
      (details as any).capabilityNodeID ??
      (details as any).node_id ??
      (details as any).nodeId ??
      null;

    return {
      ...a,
      capability_node_id: capabilityNodeId,
      capabilityNodeId: capabilityNodeId,
      severity: a.severity == null ? null : Number(a.severity),
      details: {
        ...details,
        capability_node_id: capabilityNodeId,
        capabilityNodeId: capabilityNodeId,
      },
    };
  }) as ProgramHealthAbsence[];

  // 3) Snapshot history (canonical surface) — latest + recent history per horizon
  const latestSnapshotsByHorizon: Record<string, ProgramHealthSnapshot | null> = {};
  const snapshotHistoryByHorizon: Record<string, ProgramHealthSnapshot[]> = {};

  // Keep this intentionally shallow and predictable: 4 horizons x (latest + last 10)
  for (const h of HORIZONS) {
    latestSnapshotsByHorizon[h] = await readLatestSnapshotForHorizon(supabase, programId, h);
    snapshotHistoryByHorizon[h] = await readSnapshotHistoryForHorizon(supabase, programId, h, 10);
  }

  const defaultSnapshot =
    latestSnapshotsByHorizon.H1 ??
    latestSnapshotsByHorizon.H2 ??
    latestSnapshotsByHorizon.H3 ??
    latestSnapshotsByHorizon.H0 ??
    null;

  console.log("[PH readProgramHealthView]", {
  programId,
  nodeCount: (capabilityNodes ?? []).length,
  absenceCount: (normalizedAbsences ?? absences ?? []).length,
  sampleAbsence: (normalizedAbsences ?? absences ?? [])[0],
});


  return {
    snapshot: defaultSnapshot,
    capabilityNodes: (capabilityNodes ?? []) as ProgramHealthCapabilityNode[],
    absences: normalizedAbsences,
    latestSnapshotsByHorizon,
    snapshotHistoryByHorizon,
  };
}
