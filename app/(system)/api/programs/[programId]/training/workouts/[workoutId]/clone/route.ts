// app/api/programs/[programId]/training/workouts/[workoutId]/clone/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ programId: string; workoutId: string }> }
) {
  const { programId, workoutId } = await params;

  const { supabase } = supabaseServer(req);

  // 1) Load source workout (must be readable via RLS: global OR same program)
  const { data: srcWorkout, error: srcErr } = await supabase
    .from("workouts")
    .select("id, label, description")
    .eq("id", workoutId)
    .single();

  if (srcErr || !srcWorkout) {
    return NextResponse.json(
      { error: "Workout not found or not accessible." },
      { status: 404 }
    );
  }

  // 2) Create new program-owned workout
  const { data: newWorkout, error: insErr } = await supabase
    .from("workouts")
    .insert({
      program_id: programId,
      label: srcWorkout.label,
      description: srcWorkout.description,
      is_system_template: false,
    })
    .select("id")
    .single();

  if (insErr || !newWorkout) {
    return NextResponse.json({ error: insErr?.message ?? "Failed to clone workout." }, { status: 400 });
  }

  // 3) Copy steps
  const { data: srcSteps, error: stepsErr } = await supabase
    .from("workout_steps")
    .select("step_index, label, exercise_id, training_event_template_id, parameters_override")
    .eq("workout_id", workoutId)
    .order("step_index", { ascending: true });

  if (stepsErr) {
    return NextResponse.json({ error: stepsErr.message }, { status: 400 });
  }

  if (srcSteps?.length) {
    const rows = srcSteps.map((s) => ({
      workout_id: newWorkout.id,
      step_index: s.step_index,
      label: s.label,
      exercise_id: s.exercise_id,
      training_event_template_id: s.training_event_template_id,
      parameters_override: s.parameters_override ?? {},
    }));

    const { error: copyErr } = await supabase.from("workout_steps").insert(rows);
    if (copyErr) {
      return NextResponse.json({ error: copyErr.message }, { status: 400 });
    }
  }

  return NextResponse.json({ workoutId: newWorkout.id });
}