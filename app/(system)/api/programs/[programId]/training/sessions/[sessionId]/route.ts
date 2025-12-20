// app/api/programs/[programId]/training/sessions/[sessionId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";

const coachUpdateSessionSchema = z.object({
  // Shared
  title: z.string().min(1).max(255).optional(),
  scheduledDate: z.string().min(1).optional(), // ISO date string (YYYY-MM-DD)

  // Planned
  plannedRpe: z.number().int().min(1).max(10).optional(),
  plannedDistanceM: z.number().int().nonnegative().optional(),
  plannedDurationSec: z.number().int().nonnegative().optional(),
  plannedDescription: z.string().max(4000).optional(),
  coachNotes: z.string().max(4000).optional(),

  // Actuals (coach can edit)
  completedAt: z.string().min(1).optional(), // ISO datetime string
  actualRpe: z.number().int().min(1).max(10).optional(),
  actualDistanceM: z.number().int().nonnegative().optional(),
  actualDurationSec: z.number().int().nonnegative().optional(),
  actualDescription: z.string().max(4000).optional(),
  metricsJson: z.record(z.string(), z.any()).optional(),
});

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

// PATCH: coach updates planned fields / notes for a training session
export async function PATCH(req: NextRequest, context: any) {
  const { programId, sessionId } = context.params;

  const { supabase, errorResponse } = await getProgramMemberOrError(req, programId);
  if (errorResponse) return errorResponse;

  const json = await req.json().catch(() => null);
  const parsed = coachUpdateSessionSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const {
    title,
    scheduledDate,

    plannedRpe,
    plannedDistanceM,
    plannedDurationSec,
    plannedDescription,
    coachNotes,

    completedAt,
    actualRpe,
    actualDistanceM,
    actualDurationSec,
    actualDescription,
    metricsJson,
  } = parsed.data;

  const updatePayload: Record<string, any> = {};

  if (typeof title === "string") {
    updatePayload.title = title;
  }
  if (typeof scheduledDate === "string") {
    updatePayload.scheduled_date = scheduledDate;
  }
  if (typeof plannedRpe === "number") {
    updatePayload.planned_rpe = plannedRpe;
  }
  if (typeof plannedDistanceM === "number") {
    updatePayload.planned_distance_m = plannedDistanceM;
  }
  if (typeof plannedDurationSec === "number") {
    updatePayload.planned_duration_sec = plannedDurationSec;
  }
  if (typeof plannedDescription === "string") {
    updatePayload.planned_description = plannedDescription;
  }
  if (typeof coachNotes === "string") {
    updatePayload.coach_notes = coachNotes;
  }

  if (typeof completedAt === "string") {
    updatePayload.completed_at = completedAt;
  }
  if (typeof actualRpe === "number") {
    updatePayload.actual_rpe = actualRpe;
  }
  if (typeof actualDistanceM === "number") {
    updatePayload.actual_distance_m = actualDistanceM;
  }
  if (typeof actualDurationSec === "number") {
    updatePayload.actual_duration_sec = actualDurationSec;
  }
  if (typeof actualDescription === "string") {
    updatePayload.actual_description = actualDescription;
  }
  if (metricsJson && typeof metricsJson === "object") {
    updatePayload.metrics_json = metricsJson;
  }

  // Always bump updated_at when a coach modifies a session
  if (Object.keys(updatePayload).length > 0) {
    updatePayload.updated_at = new Date().toISOString();
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json(
      { error: "No fields to update" },
      { status: 400 }
    );
  }

  // Ensure this session belongs to the given program (direct scope)
  const { data: session, error: sessionError } = await supabase
    .from("athlete_training_sessions")
    .select("id, program_id")
    .eq("id", sessionId)
    .eq("program_id", programId)
    .maybeSingle();

  if (sessionError) {
    console.error("[Coach PATCH training session] lookup error", sessionError);
    return NextResponse.json(
      { error: "Failed to load training session" },
      { status: 500 }
    );
  }

  if (!session) {
    return NextResponse.json(
      { error: "Training session not found for this program" },
      { status: 404 }
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from("athlete_training_sessions")
    .update(updatePayload)
    .eq("id", sessionId)
    .select("*")
    .maybeSingle();

  if (updateError) {
    console.error("[Coach PATCH training session] update error", updateError);
    return NextResponse.json(
      { error: "Failed to update training session" },
      { status: 500 }
    );
  }

  if (!updated) {
    return NextResponse.json(
      { error: "Training session not found after update" },
      { status: 404 }
    );
  }

  return NextResponse.json({ session: updated }, { status: 200 });
}