// app/api/athletes/[athleteId]/training/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type Params = {
  params: Promise<{
    athleteId: string;
  }>;
};

async function getAuthAndVerifyAthlete(req: NextRequest, athleteId: string) {
  const { supabase } = await supabaseServer(req);

  // Get auth user
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
    };
  }

  // Verify this athlete belongs to the auth user
  const { data: athlete, error: athleteError } = await supabase
    .from("athletes")
    .select("user_id")
    .eq("id", athleteId)
    .single();

  if (athleteError || !athlete) {
    return {
      errorResponse: NextResponse.json(
        { error: "Athlete not found" },
        { status: 404 }
      ),
      supabase,
      user: null,
    };
  }

  if (athlete.user_id !== user.id) {
    return {
      errorResponse: NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      ),
      supabase,
      user: null,
    };
  }

  return { supabase, user, errorResponse: null };
}

// GET: list recent training sessions for this athlete
export async function GET(req: NextRequest, { params }: Params) {
  const { athleteId } = await params;

  const { supabase, errorResponse } = await getAuthAndVerifyAthlete(
    req,
    athleteId
  );
  if (errorResponse) return errorResponse;

  const { data, error } = await supabase
    .from("athlete_training_sessions")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("scheduled_date", { ascending: false })
    .order("completed_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("[GET training] error", error);
    return NextResponse.json(
      { error: "Failed to load training sessions" },
      { status: 500 }
    );
  }

  return NextResponse.json({ sessions: data ?? [] });
}

// POST: quick-create a self-assigned training session (logged by athlete)
export async function POST(req: NextRequest, { params }: Params) {
  const { athleteId } = await params;

  const { supabase, user, errorResponse } = await getAuthAndVerifyAthlete(
    req,
    athleteId
  );
  if (errorResponse || !user) return errorResponse!;

  const body = await req.json().catch(() => ({} as any));
  const {
    workout_category,
    title,
    date,
    actual_distance_m,
    actual_duration_sec,
    actual_rpe,
    actual_description,
  } = body;

  if (!workout_category) {
    return NextResponse.json(
      { error: "workout_category is required" },
      { status: 400 }
    );
  }

  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("athlete_training_sessions")
    .insert({
      athlete_id: athleteId,
      source: "self_assigned",
      coach_member_id: null,
      team_season_id: null,
      scheduled_date: date || nowIso.slice(0, 10),
      // For quick log we treat this as completed at creation
      completed_at: nowIso,
      workout_category,
      title: title || null,
      planned_description: null,
      planned_distance_m: null,
      planned_duration_sec: null,
      planned_rpe: null,
      actual_distance_m: actual_distance_m ?? null,
      actual_duration_sec: actual_duration_sec ?? null,
      actual_rpe: actual_rpe ?? null,
      actual_description: actual_description || null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[POST training] error", error);
    return NextResponse.json(
      { error: "Failed to create training session" },
      { status: 500 }
    );
  }

  return NextResponse.json({ session: data }, { status: 201 });
}
