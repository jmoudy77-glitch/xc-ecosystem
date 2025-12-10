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

    // === 2) Insert practice_groups ===
    // groups: PracticeGroupPayload[]   (name + athletes[])
    // groupAssignments: Record<groupName, WorkoutPayload[]>
    //
    // Schema requirement: practice_groups.workout_id is NOT NULL.
    // Therefore each group MUST have exactly one assigned workout.

    const practiceGroupsToInsert: {
      practice_plan_id: string;
      label: string;
      event_group: string | null;
      workout_id: string;
      notes: string | null;
    }[] = [];

    for (const g of groups) {
      const groupName = g.name;
      const workoutsForGroup = groupAssignments[groupName] || [];

      if (!workoutsForGroup.length) {
        console.error("[practice/save] Group missing workout assignment", { groupName });
        return NextResponse.json(
          { error: `Group '${groupName}' requires exactly one workout assignment.` },
          { status: 400 }
        );
      }

      // Pick the first workout — UI currently only supports one.
      const workout = workoutsForGroup[0];
      if (!workout?.id) {
        console.error("[practice/save] Invalid workout payload", { groupName, workout });
        return NextResponse.json(
          { error: `Invalid workout for group '${groupName}'.` },
          { status: 400 }
        );
      }

      practiceGroupsToInsert.push({
        practice_plan_id: practicePlanId,
        label: groupName,
        event_group: null,
        workout_id: workout.id,
        notes: null,
      });
    }

    const { data: insertedGroups, error: groupsError } = await supabaseAdmin
      .from("practice_groups")
      .insert(practiceGroupsToInsert)
      .select("id, label");

    if (groupsError) {
      console.error("[practice/save] failed to insert practice_groups", { groupsError });
      return NextResponse.json(
        { error: "Failed to create practice groups." },
        { status: 500 }
      );
    }

    // Map group name → inserted group id
    const groupIdMap = new Map<string, string>();
    for (const row of insertedGroups) {
      groupIdMap.set(row.label, row.id);
    }

    // === 3) Insert practice_group_assignments ===
    // assignments: from each groupName, list of athlete IDs from the modal.
    // schema allows either athlete_id or team_roster_id. For now we use athlete_id.

    const assignmentRows: {
      practice_group_id: string;
      athlete_id: string;
    }[] = [];

    for (const g of groups) {
      const groupId = groupIdMap.get(g.name);
      if (!groupId) continue;

      for (const athlete of g.athletes) {
        assignmentRows.push({
          practice_group_id: groupId,
          athlete_id: athlete.id,
        });
      }
    }

    if (assignmentRows.length > 0) {
      const { error: assignError } = await supabaseAdmin
        .from("practice_group_assignments")
        .insert(assignmentRows);

      if (assignError) {
        console.error("[practice/save] failed to insert practice_group_assignments", { assignError });
        return NextResponse.json(
          { error: "Failed to assign athletes to groups." },
          { status: 500 }
        );
      }
    }

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