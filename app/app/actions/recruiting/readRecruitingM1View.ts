"use server";

import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabaseServer";

const HORIZONS = ["H0", "H1", "H2", "H3"] as const;
type Horizon = (typeof HORIZONS)[number];

export type RecruitingStabilizationBand =
  | "within_tolerances"
  | "stabilizing_required";

export type RecruitingM1RecruitableAbsence = {
  absence_key: string | null;
  absence_type: string | null;
  sport: string | null;
  horizon: string | null;
  severity: string | number | null;
  notes: string | null;
  capability_node_id: string | null;
  sector_key: string | null;
  details: any;
  created_at: string | null;
  updated_at: string | null;
};

export type RecruitingM1ViewModel = {
  programId: string;
  horizon: Horizon | null;
  snapshotId: string | null;
  snapshotCreatedAt: string | null;
  recruitableAbsences: RecruitingM1RecruitableAbsence[];
  stabilization: {
    band: RecruitingStabilizationBand;
    message: string;
    recruitableAbsenceCount: number;
  };
};

async function readLatestSnapshotForHorizon(
  supabase: any,
  programId: string,
  horizon: Horizon
): Promise<any | null> {
  const { data, error } = await supabase
    .from("program_health_snapshots")
    .select("id, program_id, sport, horizon, created_at, full_payload, summary")
    .eq("program_id", programId)
    .eq("horizon", horizon)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0] ?? null;
}

function isRecruitableAbsence(a: any): boolean {
  const details = (a?.details ?? {}) as any;
  const recruitability = details?.recruitability;
  return recruitability === "recruitable";
}

export async function readRecruitingM1View(programId: string): Promise<RecruitingM1ViewModel> {
  const cookieStore = await cookies();
  const { supabase } = await supabaseServer(cookieStore);

  const latestByHorizon: Record<Horizon, any | null> = {
    H0: null,
    H1: null,
    H2: null,
    H3: null,
  };

  for (const h of HORIZONS) {
    latestByHorizon[h] = await readLatestSnapshotForHorizon(supabase, programId, h);
  }

  const chosen =
    latestByHorizon.H1 ??
    latestByHorizon.H2 ??
    latestByHorizon.H3 ??
    latestByHorizon.H0 ??
    null;

  const absences: any[] = (chosen?.full_payload?.absences ?? []) as any[];
  const recruitableAbsences = absences.filter(isRecruitableAbsence).map((a) => {
    const details = (a?.details ?? {}) as any;
    return {
      absence_key: a?.absence_key ?? null,
      absence_type: a?.absence_type ?? null,
      sport: a?.sport ?? chosen?.sport ?? null,
      horizon: a?.horizon ?? chosen?.horizon ?? null,
      severity: a?.severity ?? null,
      notes: a?.notes ?? null,
      capability_node_id: a?.capability_node_id ?? null,
      sector_key: a?.sector_key ?? null,
      details,
      created_at: a?.created_at ?? null,
      updated_at: a?.updated_at ?? null,
    } as RecruitingM1RecruitableAbsence;
  });

  const recruitableAbsenceCount = recruitableAbsences.length;
  const band: RecruitingStabilizationBand =
    recruitableAbsenceCount === 0 ? "within_tolerances" : "stabilizing_required";

  const message =
    band === "within_tolerances"
      ? "Recruitable risk is within defined tolerances."
      : "Recruitable risk requires stabilization.";

  return {
    programId,
    horizon: (chosen?.horizon as Horizon) ?? null,
    snapshotId: (chosen?.id as string) ?? null,
    snapshotCreatedAt: (chosen?.created_at as string) ?? null,
    recruitableAbsences,
    stabilization: {
      band,
      message,
      recruitableAbsenceCount,
    },
  };
}
