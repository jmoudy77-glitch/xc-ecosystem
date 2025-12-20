// /Users/joshmoudy/Library/CloudStorage/GoogleDrive-jmoudy77@gmail.com/My Drive/Ecosystem_Live/xc-ecosystem/app/api/programs/[programId]/training/workouts/[workoutId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

function jsonError(message: string, status: number, code?: string) {
  return NextResponse.json(
    { ok: false, error: { message, code } },
    { status }
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ programId: string; workoutId: string }> }
) {
  const { programId, workoutId } = await params;
  const { supabase } = supabaseServer(req);

  // 1) Fetch workout (RLS will enforce access)
  const { data: workout, error: workoutError } = await supabase
    .from("workouts")
    .select("id, program_id, label, description, is_system_template, archived_at, created_at, updated_at")
    .eq("id", workoutId)
    .single();

  if (workoutError) {
    const status = workoutError.code === "PGRST116" ? 404 : 500;
    return jsonError(workoutError.message, status, workoutError.code);
  }

  // Optional: hard guard to prevent cross-program leakage if a program workout is requested via another programId
  // (Global workouts may be “anchored” to a program_id depending on your approach, so don’t block on program_id here.)
  // If you want strict matching for non-global:
  if (!workout.is_system_template && workout.program_id !== programId) {
    return jsonError("Not found", 404);
  }

  // 2) Fetch steps + exercise info
  const { data: steps, error: stepsError } = await supabase
    .from("workout_steps")
    .select(
      `
      id,
      workout_id,
      step_index,
      label,
      parameters_override,
      exercise_id,
      exercise:exercise_id (
        id,
        program_id,
        label,
        description,
        workout_category,
        measurement_unit,
        tags,
        is_active,
        metadata
      )
    `
    )
    .eq("workout_id", workoutId)
    .order("step_index", { ascending: true });

  if (stepsError) {
    return jsonError(stepsError.message, 500, stepsError.code);
  }

  const normalizedSteps = (steps ?? []).map((s: any) => {
    const ex = s.exercise ?? null;

    return {
      id: s.id,
      workoutId: s.workout_id,
      stepIndex: s.step_index,
      label: (s.label ?? ex?.label ?? "").trim(),
      params: s.parameters_override ?? {},
      exercise: ex
        ? {
            id: ex.id,
            programId: ex.program_id ?? null,
            isGlobal: ex.program_id == null,
            label: ex.label,
            description: ex.description ?? null,
            workoutCategory: ex.workout_category,
            measurementUnit: ex.measurement_unit,
            tags: ex.tags ?? [],
            isActive: ex.is_active,
            metadata: ex.metadata ?? {},
          }
        : null,
    };
  });

  const normalizedWorkout = {
    id: workout.id,
    programId: workout.program_id ?? null,
    label: workout.label,
    description: workout.description ?? null,
    isGlobal: !!workout.is_system_template,
    archivedAt: (workout as any).archived_at ?? null,
    createdAt: workout.created_at,
    updatedAt: workout.updated_at,
  };

  return jsonOk({
    workout: normalizedWorkout,
    steps: normalizedSteps,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ programId: string; workoutId: string }> }
) {
  const { programId, workoutId } = await params;
  const { supabase } = supabaseServer(req);

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const action = String(body?.action ?? "").trim();
  if (action !== "archive" && action !== "unarchive") {
    return jsonError("Invalid action", 400, "invalid_action");
  }

  // Fetch workout (RLS enforced)
  const { data: workout, error: workoutError } = await supabase
    .from("workouts")
    .select("id, program_id, is_system_template, archived_at")
    .eq("id", workoutId)
    .single();

  if (workoutError) {
    const status = workoutError.code === "PGRST116" ? 404 : 500;
    return jsonError(workoutError.message, status, workoutError.code);
  }

  // Do not allow archiving/unarchiving system templates
  if (workout.is_system_template) {
    return jsonError("System workouts cannot be archived", 400, "system_workout");
  }

  // Guard against cross-program usage
  if (workout.program_id !== programId) {
    return jsonError("Not found", 404);
  }

  const patch: Record<string, any> =
    action === "archive"
      ? { archived_at: new Date().toISOString() }
      : { archived_at: null };

  const { data: updated, error: updateError } = await supabase
    .from("workouts")
    .update(patch)
    .eq("id", workoutId)
    .select("id, archived_at, updated_at")
    .single();

  if (updateError) {
    return jsonError(updateError.message, 500, updateError.code);
  }

  return jsonOk({
    id: updated.id,
    archivedAt: (updated as any).archived_at ?? null,
    updatedAt: updated.updated_at,
  });
}