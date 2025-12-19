// app/api/practice/save/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Local mirrors of the modal types.
// (Kept minimal so we don't hard-couple to the TS in the client.)
type PracticeGroupPayload = {
  name: string;
  eventGroup?: string | null;
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

    // Normalize optional time fields so they become full ISO datetimes for timestamptz.
    // If the client sends bare "HH:MM" strings, we combine them with practiceDate.
    function buildDateTime(date: string, timeValue?: string | null): string | null {
      if (!timeValue) return null;
      const trimmed = timeValue.trim();
      if (!trimmed) return null;

      // If the value already looks like a full ISO datetime, pass it through.
      if (trimmed.includes("T")) {
        return trimmed;
      }

      // Assume "HH:MM" (optionally with seconds) and combine with the practiceDate.
      // We leave off the trailing "Z" so Postgres treats it as a local timestamp with time zone.
      return `${date}T${trimmed}:00`;
    }

    const normalizedStartTime = buildDateTime(practiceDate, startTime);
    const normalizedEndTime = buildDateTime(practiceDate, endTime);

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

    const practiceGroupsToInsert: {
      practice_plan_id: string;
      label: string;
      event_group: string | null;
      workout_id: string;
      notes: string | null;
    }[] = [];

    const groupInfoMap = new Map<
      string,
      { groupId: string; workoutId: string }
    >();

    // Only create groups for groups that have at least one athlete.
    for (const g of groups) {
      if (!g.athletes || g.athletes.length === 0) {
        continue;
      }

      const groupName = g.name;
      const workoutsForGroup = groupAssignments[groupName] || [];

      if (!workoutsForGroup.length) {
        // No group workout assigned; skip creating a practice_group row for this group.
        continue;
      }

      // Pick the first workout — UI currently only supports one.
      const workout = workoutsForGroup[0];
      if (!workout?.label) {
        console.error("[practice/save] Invalid workout payload", { groupName, workout });
        return NextResponse.json(
          { error: `Invalid workout for group '${groupName}'.` },
          { status: 400 }
        );
      }

      // Create a concrete workouts row so we have a real UUID for workout_id
      const { data: workoutRow, error: workoutError } = await supabaseAdmin
        .from("workouts")
        .insert({
          program_id: programId,
          label: workout.label,
          description: workout.description ?? null,
          is_system_template: false,
          created_by_program_member_id: createdByProgramMemberId ?? null,
        })
        .select("id")
        .single();

      if (workoutError || !workoutRow) {
        console.error("[practice/save] failed to insert workouts row for group", {
          groupName,
          workoutError,
        });
        return NextResponse.json(
          { error: "Failed to create group workout for practice." },
          { status: 500 }
        );
      }

      practiceGroupsToInsert.push({
        practice_plan_id: practicePlanId,
        label: groupName,
        event_group: g.eventGroup ?? null,
        workout_id: workoutRow.id as string,
        notes: null,
      });
    }

    if (practiceGroupsToInsert.length > 0) {
      const { data: insertedGroups, error: groupsError } = await supabaseAdmin
        .from("practice_groups")
        .insert(practiceGroupsToInsert)
        .select("id, label, workout_id");

      if (groupsError) {
        console.error("[practice/save] failed to insert practice_groups", { groupsError });
        return NextResponse.json(
          { error: "Failed to create practice groups." },
          { status: 500 }
        );
      }

      // Map group name → inserted group info (group id + workout id)
      for (const row of insertedGroups) {
        groupInfoMap.set(row.label, {
          groupId: row.id as string,
          workoutId: row.workout_id as string,
        });
      }

      // === 3) Insert practice_group_assignments ===
      // assignments: from each groupName, list of athlete IDs from the modal.
      // schema allows either athlete_id or team_roster_id. For now we use athlete_id.

      const assignmentRows: {
        practice_group_id: string;
        athlete_id: string;
      }[] = [];

      for (const g of groups) {
        if (!g.athletes || g.athletes.length === 0) continue;

        const groupInfo = groupInfoMap.get(g.name);
        if (!groupInfo) continue;

        for (const athlete of g.athletes) {
          assignmentRows.push({
            practice_group_id: groupInfo.groupId,
            athlete_id: athlete.id,
          });
        }
      }

      if (assignmentRows.length > 0) {
        const { error: assignError } = await supabaseAdmin
          .from("practice_group_assignments")
          .insert(assignmentRows);

        if (assignError) {
          console.error("[practice/save] failed to insert practice_group_assignments", {
            assignError,
          });
          return NextResponse.json(
            { error: "Failed to assign athletes to groups." },
            { status: 500 }
          );
        }
      }

      // === 4) Insert athlete_training_sessions ===
      // One planned session per athlete per group workout.

      const sessionRows: {
        program_id: string;
        athlete_id: string;
        source: string;
        coach_member_id: string | null;
        team_season_id: string;
        scheduled_date: string;
        workout_category: string;
        title: string;
        practice_plan_id: string;
        practice_group_id: string;
        workout_id: string;
      }[] = [];

      for (const g of groups) {
        if (!g.athletes || g.athletes.length === 0) continue;

        const groupInfo = groupInfoMap.get(g.name);
        if (!groupInfo) continue;

        for (const athlete of g.athletes) {
          sessionRows.push({
            program_id: programId,
            athlete_id: athlete.id,
            source: "coach_assigned",
            coach_member_id: createdByProgramMemberId ?? null,
            team_season_id: seasonId,
            scheduled_date: practiceDate,
            workout_category: "run", // default for now; can be refined later
            title: `${safeLabel} - ${g.name}`,
            practice_plan_id: practicePlanId,
            practice_group_id: groupInfo.groupId,
            workout_id: groupInfo.workoutId,
          });
        }
      }

      if (sessionRows.length > 0) {
        const { error: sessionsError } = await supabaseAdmin
          .from("athlete_training_sessions")
          .insert(sessionRows);

        if (sessionsError) {
          console.error("[practice/save] failed to insert athlete_training_sessions", {
            sessionsError,
          });
          return NextResponse.json(
            { error: "Failed to create athlete training sessions." },
            { status: 500 }
          );
        }
      }
    }

    // === 5) Individual athlete_training_sessions ===
    // These are per-athlete workouts that may or may not be tied to a group.

    const individualSessionRows: {
      program_id: string;
      athlete_id: string;
      source: string;
      coach_member_id: string | null;
      team_season_id: string;
      scheduled_date: string;
      workout_category: string;
      title: string;
      practice_plan_id: string;
      practice_group_id: string | null;
      workout_id: string;
    }[] = [];

    for (const lane of individualLanes) {
      const workoutsForAthlete =
        individualAssignments[lane.athleteId] || [];

      if (!workoutsForAthlete || workoutsForAthlete.length === 0) continue;

      for (const workout of workoutsForAthlete) {
        if (!workout?.label) continue;

        // Create a concrete workouts row for this individual session.
        const { data: workoutRow, error: workoutError } = await supabaseAdmin
          .from("workouts")
          .insert({
            program_id: programId,
            label: workout.label,
            description: workout.description ?? null,
            is_system_template: false,
            created_by_program_member_id: createdByProgramMemberId ?? null,
          })
          .select("id")
          .single();

        if (workoutError || !workoutRow) {
          console.error(
            "[practice/save] failed to insert individual workout row",
            {
              lane,
              workoutError,
            }
          );
          return NextResponse.json(
            { error: "Failed to create individual workout for practice." },
            { status: 500 }
          );
        }

        const groupInfo = groupInfoMap.get(lane.fromGroupName);

        individualSessionRows.push({
          program_id: programId,
          athlete_id: lane.athleteId,
          source: "coach_assigned",
          coach_member_id: createdByProgramMemberId ?? null,
          team_season_id: seasonId,
          scheduled_date: practiceDate,
          workout_category: "run", // default; can be refined per workout type
          title: `${safeLabel} - Individual`,
          practice_plan_id: practicePlanId,
          practice_group_id: groupInfo ? groupInfo.groupId : null,
          workout_id: workoutRow.id as string,
        });
      }
    }

    if (individualSessionRows.length > 0) {
      const { error: indivSessionsError } = await supabaseAdmin
        .from("athlete_training_sessions")
        .insert(individualSessionRows);

      if (indivSessionsError) {
        console.error(
          "[practice/save] failed to insert individual athlete_training_sessions",
          { indivSessionsError }
        );
        return NextResponse.json(
          { error: "Failed to create individual athlete training sessions." },
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