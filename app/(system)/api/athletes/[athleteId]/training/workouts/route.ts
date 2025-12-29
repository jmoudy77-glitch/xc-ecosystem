// app/api/programs/[programId]/training/workouts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";

type Ctx = { params: Promise<Record<string, string>> };

const createWorkoutSchema = z.object({
  label: z.string().min(1),
  steps: z
    .array(
      z.object({
        trainingEventTemplateId: z.string().uuid(),
        label: z.string().min(1),
      })
    )
    .min(1),
});

async function getProgramMemberOrError(req: NextRequest, programId: string) {
  const { supabase } = await supabaseServer(req);

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

// GET: list workouts for a program (with steps)
export async function GET(req: NextRequest, { params }: Ctx) {
  const { programId } = await params;

  const { supabase, errorResponse } = await getProgramMemberOrError(req, programId);
  if (errorResponse) return errorResponse;

  const { data: workouts, error: workoutsError } = await supabase
    .from("workouts")
    .select("id, program_id, label, created_at")
    .eq("program_id", programId)
    .order("label", { ascending: true });

  if (workoutsError) {
    console.error("[GET workouts] workouts error", workoutsError);
    return NextResponse.json(
      { error: "Failed to load workouts" },
      { status: 500 }
    );
  }

  if (!workouts || workouts.length === 0) {
    return NextResponse.json({ workouts: [] }, { status: 200 });
  }

  const workoutIds = workouts.map((w) => w.id);

  const { data: steps, error: stepsError } = await supabase
    .from("workout_steps")
    .select("id, workout_id, step_index, training_event_template_id, label")
    .in("workout_id", workoutIds)
    .order("step_index", { ascending: true });

  if (stepsError) {
    console.error("[GET workouts] steps error", stepsError);
    return NextResponse.json(
      { error: "Failed to load workout steps" },
      { status: 500 }
    );
  }

  const stepsByWorkout: Record<string, any[]> = {};
  (steps ?? []).forEach((s) => {
    if (!stepsByWorkout[s.workout_id]) stepsByWorkout[s.workout_id] = [];
    stepsByWorkout[s.workout_id].push(s);
  });

  const result = workouts.map((w) => ({
    ...w,
    steps: stepsByWorkout[w.id] ?? [],
  }));

  return NextResponse.json({ workouts: result }, { status: 200 });
}

// POST: create a new workout + steps
export async function POST(req: NextRequest, { params }: Ctx) {
  const { programId } = await params;

  const { supabase, programMember, errorResponse } = await getProgramMemberOrError(
    req,
    programId
  );
  if (errorResponse) return errorResponse;

  const json = await req.json().catch(() => null);
  const parsed = createWorkoutSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { label, steps } = parsed.data;

  // Insert workout
  const { data: workout, error: workoutError } = await supabase
    .from("workouts")
    .insert({
      program_id: programId,
      label,
      created_by_program_member_id: programMember.id,
    })
    .select("id, program_id, label, created_at")
    .single();

  if (workoutError || !workout) {
    console.error("[POST workout] insert workout error", workoutError);
    return NextResponse.json(
      { error: "Failed to create workout" },
      { status: 500 }
    );
  }

  // Insert steps
  const stepRows = steps.map((step, index) => ({
    workout_id: workout.id,
    step_index: index + 1,
    training_event_template_id: step.trainingEventTemplateId,
    label: step.label,
  }));

  const { data: insertedSteps, error: stepsError } = await supabase
    .from("workout_steps")
    .insert(stepRows)
    .select("id, workout_id, step_index, training_event_template_id, label")
    .order("step_index", { ascending: true });

  if (stepsError) {
    console.error("[POST workout] insert steps error", stepsError);
    // Optionally: delete the workout if step insert fails
    await supabase.from("workouts").delete().eq("id", workout.id);
    return NextResponse.json(
      { error: "Failed to create workout steps" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      workout: {
        ...workout,
        steps: insertedSteps ?? [],
      },
    },
    { status: 201 }
  );
}