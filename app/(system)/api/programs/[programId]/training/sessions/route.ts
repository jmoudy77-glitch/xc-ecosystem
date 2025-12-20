// /Users/joshmoudy/Library/CloudStorage/GoogleDrive-jmoudy77@gmail.com/My Drive/Ecosystem_Live/xc-ecosystem/app/api/programs/[programId]/training/sessions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";

// -----------------------------
// Schemas
// -----------------------------

const listQuerySchema = z.object({
  teamSeasonId: z.string().uuid().optional(),
  athleteId: z.string().uuid().optional(),
  fromDate: z.string().optional(), // YYYY-MM-DD
  toDate: z.string().optional(),   // YYYY-MM-DD
});

const createSessionSchema = z.object({
  athleteId: z.string().uuid(),

  // Scope
  teamSeasonId: z.string().uuid().optional(),

  // Classification
  source: z.enum(["coach_assigned", "self_assigned"]).default("coach_assigned"),
  workoutCategory: z.enum(["run", "gym", "cross_training", "other"]),

  // Scheduling
  scheduledDate: z.string().min(1), // YYYY-MM-DD

  // Optional links
  practicePlanId: z.string().uuid().optional(),
  practiceGroupId: z.string().uuid().optional(),
  workoutId: z.string().uuid().optional(),
  trainingEventTemplateId: z.string().uuid().optional(),

  // Planned
  title: z.string().max(255).optional(),
  plannedDescription: z.string().max(4000).optional(),
  plannedDistanceM: z.number().int().nonnegative().optional(),
  plannedDurationSec: z.number().int().nonnegative().optional(),
  plannedRpe: z.number().int().min(1).max(10).optional(),
});

// -----------------------------
// GET — list training sessions
// -----------------------------

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ programId: string }> },
) {
  const { programId } = await params;
  const { supabase } = supabaseServer(req);

  const parsed = listQuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  const { teamSeasonId, athleteId, fromDate, toDate } = parsed.data;

  let query = supabase
    .from("athlete_training_sessions")
    .select("*")
    .eq("program_id", programId)
    .order("scheduled_date", { ascending: true });

  if (teamSeasonId) query = query.eq("team_season_id", teamSeasonId);
  if (athleteId) query = query.eq("athlete_id", athleteId);
  if (fromDate) query = query.gte("scheduled_date", fromDate);
  if (toDate) query = query.lte("scheduled_date", toDate);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessions: data ?? [] });
}

// -----------------------------
// POST — create training session
// -----------------------------

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ programId: string }> },
) {
  const { programId } = await params;
  const { supabase } = supabaseServer(req);

  const body = await req.json();
  const parsed = createSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const {
    athleteId,
    teamSeasonId,
    source,
    workoutCategory,
    scheduledDate,
    practicePlanId,
    practiceGroupId,
    workoutId,
    trainingEventTemplateId,
    title,
    plannedDescription,
    plannedDistanceM,
    plannedDurationSec,
    plannedRpe,
  } = parsed.data;

  const { data, error } = await supabase
    .from("athlete_training_sessions")
    .insert({
      program_id: programId,
      athlete_id: athleteId,
      team_season_id: teamSeasonId ?? null,
      source,
      workout_category: workoutCategory,
      scheduled_date: scheduledDate,
      practice_plan_id: practicePlanId ?? null,
      practice_group_id: practiceGroupId ?? null,
      workout_id: workoutId ?? null,
      training_event_template_id: trainingEventTemplateId ?? null,
      title: title ?? null,
      planned_description: plannedDescription ?? null,
      planned_distance_m: plannedDistanceM ?? null,
      planned_duration_sec: plannedDurationSec ?? null,
      planned_rpe: plannedRpe ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ session: data }, { status: 201 });
}
