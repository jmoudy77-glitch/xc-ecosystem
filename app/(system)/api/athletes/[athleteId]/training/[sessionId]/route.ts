// app/api/athletes/[athleteId]/training/[sessionId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";

type Ctx = { params: Promise<Record<string, string>> };

const updateSessionSchema = z.object({
  markComplete: z.boolean().optional(),
  completedAt: z.string().datetime().optional(), // ISO string
  actualRpe: z.number().int().min(1).max(10).optional(),
  actualDistanceM: z.number().int().nonnegative().optional(),
  actualDurationSec: z.number().int().nonnegative().optional(),
  actualDescription: z.string().max(2000).optional(),
});

async function getAuthAndVerifyAthlete(
  req: NextRequest,
  athleteId: string
): Promise<{
  supabase: ReturnType<typeof supabaseServer>["supabase"];
  errorResponse: NextResponse | null;
}> {
  const { supabase } = supabaseServer(req);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: athlete, error: athleteError } = await supabase
    .from("athletes")
    .select("id, user_id")
    .eq("id", athleteId)
    .maybeSingle();

  if (athleteError) {
    console.error("[PATCH training session] athlete lookup error", athleteError);
    return {
      supabase,
      errorResponse: NextResponse.json(
        { error: "Failed to verify athlete" },
        { status: 500 }
      ),
    };
  }

  if (!athlete) {
    return {
      supabase,
      errorResponse: NextResponse.json({ error: "Athlete not found" }, { status: 404 }),
    };
  }

  if (athlete.user_id !== user.id) {
    return {
      supabase,
      errorResponse: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { supabase, errorResponse: null };
}

// PATCH: athlete updates their own training session (completion, RPE, notes, etc.)
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { athleteId, sessionId } = await params;

  const { supabase, errorResponse } = await getAuthAndVerifyAthlete(req, athleteId);
  if (errorResponse) return errorResponse;

  const json = await req.json().catch(() => null);
  const parsed = updateSessionSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const {
    markComplete,
    completedAt,
    actualRpe,
    actualDistanceM,
    actualDurationSec,
    actualDescription,
  } = parsed.data;

  const updatePayload: Record<string, any> = {};

  // Completion logic
  if (typeof markComplete === "boolean" || completedAt) {
    if (completedAt) {
      updatePayload.completed_at = completedAt;
    } else if (markComplete === true) {
      updatePayload.completed_at = new Date().toISOString();
    } else if (markComplete === false) {
      updatePayload.completed_at = null;
    }
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

  // Always bump updated_at when an athlete modifies their session
  if (Object.keys(updatePayload).length > 0) {
    updatePayload.updated_at = new Date().toISOString();
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json(
      { error: "No fields to update" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("athlete_training_sessions")
    .update(updatePayload)
    .eq("id", sessionId)
    .eq("athlete_id", athleteId)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[PATCH training session] update error", error);
    return NextResponse.json(
      { error: "Failed to update training session" },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Training session not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ session: data }, { status: 200 });
}