// app/api/practice/save/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Local mirrors of the modal types.
// (Kept minimal so we don't hard-couple to the TS in the client.)
type PracticeGroupPayload = {
  name: string;
  athletes: { id: string; name: string }[];
};

type WorkoutPayload = {
  id: string;
  label: string;
  description: string;
};

type IndividualLanePayload = {
  athleteId: string;
  name: string;
  fromGroupName: string;
};

// Optional extra fields we may send later from the client
type HeatRiskLevel = "none" | "low" | "moderate" | "high" | "extreme";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      programId,
      teamId, // currently unused by practice_plans, but kept for future joins
      seasonId,
      practiceLabel,
      practiceDate,
      startTime,
      endTime,
      location,
      notes,
      groups,
      groupAssignments,
      individualLanes,
      individualAssignments,
      // optional extras we may send later
      createdByProgramMemberId,
      weatherSnapshot,
      wbgtF,
      wbgtC,
      heatRisk,
      status,
    } = body as {
      programId: string;
      teamId: string;
      seasonId: string;
      practiceLabel?: string;
      practiceDate: string; // "YYYY-MM-DD"
      startTime?: string; // "HH:MM" or ISO; we'll normalize
      endTime?: string;
      location?: string;
      notes?: string;
      groups: PracticeGroupPayload[];
      groupAssignments: Record<string, WorkoutPayload[]>;
      individualLanes: IndividualLanePayload[];
      individualAssignments: Record<string, WorkoutPayload[]>;
      createdByProgramMemberId?: string | null;
      weatherSnapshot?: Record<string, any> | null;
      wbgtF?: number | null;
      wbgtC?: number | null;
      heatRisk?: HeatRiskLevel | null;
      status?: string | null;
    };

    // Hard requirements per schema
    if (!programId || !seasonId || !practiceDate) {
      return NextResponse.json(
        { error: "Missing required fields: programId, seasonId, or practiceDate." },
        { status: 400 }
      );
    }

    // Normalize optional time fields so empty strings don't violate timestamptz parsing
    const normalizedStartTime =
      startTime && startTime.trim() !== "" ? startTime : null;
    const normalizedEndTime =
      endTime && endTime.trim() !== "" ? endTime : null;

    // Label is NOT NULL in the schema, so we always send *something*.
    const safeLabel = (practiceLabel ?? "").trim() || "Practice";

    // Status is NOT NULL, but we allow the client to override the default if needed.
    const safeStatus = (status ?? "").trim() || "planned";

    // Build a row that exactly matches the practice_plans schema you shared.
    const row = {
      program_id: programId,
      team_season_id: seasonId,
      practice_date: practiceDate,
      label: safeLabel,
      status: safeStatus,
      // Optional, all nullable in schema
      start_time: normalizedStartTime,
      end_time: normalizedEndTime,
      location: location?.trim() || null,
      notes: notes?.trim() || null,
      created_by_program_member_id: createdByProgramMemberId ?? null,
      weather_snapshot: weatherSnapshot ?? null,
      wbgt_f: wbgtF ?? null,
      wbgt_c: wbgtC ?? null,
      heat_risk: (heatRisk as HeatRiskLevel | null) ?? null,
      // created_at / updated_at are handled by DB defaults/triggers
    };

    const { data: practicePlan, error: practiceError } = await supabaseAdmin
      .from("practice_plans")
      .insert([row])
      .select("id")
      .single();

    if (practiceError || !practicePlan) {
      console.error("[practice/save] failed to insert practice_plans", {
        practiceError,
      });
      return NextResponse.json(
        { error: "Failed to create practice plan." },
        { status: 500 }
      );
    }

    const practicePlanId = practicePlan.id as string;

    // 2) practice_groups: still disabled until we finish the schema alignment.
    //    The current table requires a non-null workout_id, which doesn't match
    //    the UI flow yet (groups can exist without a workout).
    //
    // 3) group / individual workout assignments:
    //    We'll wire these into practice_group_assignments once that table is finalized.

    return NextResponse.json(
      {
        ok: true,
        practicePlanId,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[practice/save] unexpected error", err);
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}