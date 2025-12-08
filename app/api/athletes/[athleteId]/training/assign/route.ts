// app/api/athletes/[athleteId]/training/assign/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type Params = {
  params: Promise<{
    athleteId: string;
  }>;
};

async function getCoachAndContext(req: NextRequest, athleteId: string) {
  const { supabase } = supabaseServer(req);

  // 1) Auth user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      errorResponse: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
      supabase,
      user: null,
      coachMember: null,
    };
  }

  return { supabase, user, errorResponse: null, coachMember: null };
}

/**
 * POST /api/athletes/[athleteId]/training/assign
 *
 * Body:
 * {
 *   team_season_id: string;
 *   workout_category: "run" | "gym" | "cross_training" | "other";
 *   title?: string;
 *   scheduled_date?: string;          // YYYY-MM-DD
 *   planned_description?: string;
 *   planned_distance_miles?: number;  // optional, for runs
 *   planned_duration_min?: number;    // optional
 *   planned_rpe?: number;             // 1–10
 * }
 *
 * This creates a coach-assigned training session for a specific athlete.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { athleteId } = await params;

  const { supabase, user, errorResponse } = await getCoachAndContext(
    req,
    athleteId
  );

  if (errorResponse || !user) return errorResponse!;

  const body = await req.json().catch(() => ({} as any));
  const {
    team_season_id,
    workout_category,
    title,
    scheduled_date,
    planned_description,
    planned_distance_miles,
    planned_duration_min,
    planned_rpe,
  } = body;

  if (!team_season_id) {
    return NextResponse.json(
      { error: "team_season_id is required" },
      { status: 400 }
    );
  }

  if (
    !workout_category ||
    !["run", "gym", "cross_training", "other"].includes(workout_category)
  ) {
    return NextResponse.json(
      { error: "workout_category is required and must be valid" },
      { status: 400 }
    );
  }

  // 2) Load the team_season to figure out which program this belongs to
  const { data: teamSeason, error: teamSeasonError } = await supabase
    .from("team_seasons")
    .select("id, program_id")
    .eq("id", team_season_id)
    .single();

  if (teamSeasonError || !teamSeason) {
    console.error("[assign training] team_seasons error", teamSeasonError);
    return NextResponse.json(
      { error: "Team season not found" },
      { status: 404 }
    );
  }

  const programId = teamSeason.program_id;

  // 3) Confirm this user is a program_member of that program
  const { data: coachMember, error: coachError } = await supabase
    .from("program_members")
    .select("id, role, program_id, user_id")
    .eq("program_id", programId)
    .eq("user_id", user.id)
    .single();

  if (coachError || !coachMember) {
    console.error("[assign training] coach membership not found", coachError);
    return NextResponse.json(
      { error: "You are not a coach for this program" },
      { status: 403 }
    );
  }

  // 4) (Optional but recommended) Make sure the athlete is part of this program's roster
  // You can relax this if needed, but it's safer this way.
  const { data: rosterEntry, error: rosterError } = await supabase
    .from("team_roster")
    .select("id")
    .eq("athlete_id", athleteId)
    .eq("team_season_id", team_season_id)
    .limit(1)
    .maybeSingle();

  if (rosterError) {
    console.error("[assign training] roster error", rosterError);
    return NextResponse.json(
      { error: "Failed to verify athlete roster" },
      { status: 500 }
    );
  }

  if (!rosterEntry) {
    return NextResponse.json(
      {
        error:
          "Athlete is not on the roster for this team season; cannot assign training.",
      },
      { status: 400 }
    );
  }

  // Convert planner units to storage units
  const planned_distance_m =
    typeof planned_distance_miles === "number"
      ? planned_distance_miles * 1609.34
      : null;

  const planned_duration_sec =
    typeof planned_duration_min === "number"
      ? Math.round(planned_duration_min * 60)
      : null;

  const nowIso = new Date().toISOString();

  const { data: session, error: insertError } = await supabase
    .from("athlete_training_sessions")
    .insert({
      athlete_id: athleteId,
      source: "coach_assigned",
      coach_member_id: coachMember.id,
      team_season_id,
      scheduled_date: scheduled_date || nowIso.slice(0, 10),
      completed_at: null,
      workout_category,
      title: title || null,
      planned_description: planned_description || null,
      planned_distance_m,
      planned_duration_sec,
      planned_rpe: planned_rpe ?? null,
      actual_distance_m: null,
      actual_duration_sec: null,
      actual_rpe: null,
      actual_description: null,
    })
    .select("*")
    .single();

  if (insertError || !session) {
    console.error("[assign training] insert error", insertError);
    return NextResponse.json(
      { error: "Failed to assign training session" },
      { status: 500 }
    );
  }

  return NextResponse.json({ session }, { status: 201 });
}