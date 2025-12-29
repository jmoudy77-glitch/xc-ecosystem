// app/api/programs/[programId]/training/practices/[practiceId]/generate-sessions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type Ctx = { params: Promise<Record<string, string>> };

async function getProgramMemberOrError(req: NextRequest, programId: string) {
  const { supabase } = supabaseServer(req);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      programMember: null,
      errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: programMember, error: pmError } = await supabase
    .from("program_members")
    .select("id, program_id")
    .eq("user_id", user.id)
    .eq("program_id", programId)
    .maybeSingle();

  if (pmError || !programMember) {
    return {
      supabase,
      programMember: null,
      errorResponse: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { supabase, programMember, errorResponse: null };
}

// POST: generate athlete_training_sessions from a practice's groups/assignments
export async function POST(req: NextRequest, { params }: Ctx) {
  const { programId, practiceId } = await params;

  const { supabase, programMember, errorResponse } = await getProgramMemberOrError(
    req,
    programId
  );
  if (errorResponse) return errorResponse;

  // 1) Load practice to get team_season_id + practice_date
  const { data: practice, error: practiceError } = await supabase
    .from("practice_plans")
    .select("id, program_id, team_season_id, practice_date, label")
    .eq("id", practiceId)
    .eq("program_id", programId)
    .maybeSingle();

  if (practiceError) {
    console.error("[generate-sessions] practice error", practiceError);
    return NextResponse.json(
      { error: "Failed to load practice" },
      { status: 500 }
    );
  }

  if (!practice) {
    return NextResponse.json({ error: "Practice not found" }, { status: 404 });
  }

  // 2) Load groups for this practice
  const { data: groups, error: groupsError } = await supabase
    .from("practice_groups")
    .select("id, practice_plan_id, label, event_group, workout_id")
    .eq("practice_plan_id", practiceId);

  if (groupsError) {
    console.error("[generate-sessions] groups error", groupsError);
    return NextResponse.json(
      { error: "Failed to load practice groups" },
      { status: 500 }
    );
  }

  if (!groups || groups.length === 0) {
    return NextResponse.json(
      { error: "No groups found for this practice" },
      { status: 400 }
    );
  }

  const groupIds = groups.map((g) => g.id);

  // 3) Load assignments for these groups
  const { data: assignments, error: assignmentsError } = await supabase
    .from("practice_group_assignments")
    .select("id, practice_group_id, team_roster_id, athlete_id")
    .in("practice_group_id", groupIds);

  if (assignmentsError) {
    console.error("[generate-sessions] assignments error", assignmentsError);
    return NextResponse.json(
      { error: "Failed to load group assignments" },
      { status: 500 }
    );
  }

  if (!assignments || assignments.length === 0) {
    return NextResponse.json(
      { error: "No athlete assignments found for this practice" },
      { status: 400 }
    );
  }

  // 4) Load existing sessions to avoid duplicates
  const { data: existingSessions, error: existingError } = await supabase
    .from("athlete_training_sessions")
    .select("id, athlete_id, practice_plan_id, practice_group_id")
    .eq("practice_plan_id", practiceId)
    .in("practice_group_id", groupIds);

  if (existingError) {
    console.error("[generate-sessions] existing sessions error", existingError);
    return NextResponse.json(
      { error: "Failed to load existing training sessions" },
      { status: 500 }
    );
  }

  const existingKey = new Set(
    (existingSessions ?? []).map(
      (s) => `${s.athlete_id}:${s.practice_plan_id}:${s.practice_group_id}`
    )
  );

  // Map groups by id for quick lookup
  const groupById = groups.reduce<Record<string, (typeof groups)[number]>>(
    (acc, g) => {
      acc[g.id] = g;
      return acc;
    },
    {}
  );

  // 5) Build new session rows for assignments that don't already have one
  const newSessions = assignments
    .map((a) => {
      const key = `${a.athlete_id}:${practiceId}:${a.practice_group_id}`;
      if (existingKey.has(key)) {
        return null; // skip duplicates
      }

      const group = groupById[a.practice_group_id];
      if (!group) return null;

      return {
        athlete_id: a.athlete_id,
        source: "coach_assigned" as const,
        coach_member_id: programMember!.id,
        team_season_id: practice.team_season_id,
        scheduled_date: practice.practice_date,
        workout_category: "run", // TODO: refine based on event_group or workout
        title: group.label ?? practice.label,
        planned_description: null,
        practice_plan_id: practice.id,
        practice_group_id: group.id,
        workout_id: group.workout_id,
        training_event_template_id: null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  if (newSessions.length === 0) {
    return NextResponse.json(
      { message: "No new sessions to create (already up to date)" },
      { status: 200 }
    );
  }

  // 6) Insert new sessions
  const { data: inserted, error: insertError } = await supabase
    .from("athlete_training_sessions")
    .insert(newSessions)
    .select("*");

  if (insertError) {
    console.error("[generate-sessions] insert error", insertError);
    return NextResponse.json(
      { error: "Failed to create training sessions" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      createdCount: inserted?.length ?? 0,
      sessions: inserted ?? [],
    },
    { status: 201 }
  );
}