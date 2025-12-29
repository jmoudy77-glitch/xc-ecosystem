// app/api/programs/[programId]/training/workouts/[workoutId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";

type Ctx = { params: Promise<Record<string, string>> };

const updateWorkoutSchema = z.object({
  label: z.string().min(1).optional(),
  steps: z
    .array(
      z.object({
        id: z.string().uuid().optional(), // optional; we do a replace strategy
        trainingEventTemplateId: z.string().uuid(),
        label: z.string().min(1),
      })
    )
    .optional(),
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

// GET: single workout + steps
export async function GET(req: NextRequest, { params }: Ctx) {
  const { programId, workoutId } = await params;

  const { supabase, errorResponse } = await getProgramMemberOrError(req, programId);
  if (errorResponse) return errorResponse;

  const { data: workout, error: workoutError } = await supabase
    .from("workouts")
    .select("id, program_id, label, created_at")
    .eq("id", workoutId)
    .eq("program_id", programId)
    .maybeSingle();

  if (workoutError) {
    console.error("[GET workout] load error", workoutError);
    return NextResponse.json(
      { error: "Failed to load workout" },
      { status: 500 }
    );
  }

  if (!workout) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: steps, error: stepsError } = await supabase
    .from("workout_steps")
    .select("id, workout_id, step_index, training_event_template_id, label")
    .eq("workout_id", workoutId)
    .order("step_index", { ascending: true });

  if (stepsError) {
    console.error("[GET workout] steps error", stepsError);
    return NextResponse.json(
      { error: "Failed to load workout steps" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      workout: {
        ...workout,
        steps: steps ?? [],
      },
    },
    { status: 200 }
  );
}

// PATCH: update workout label and/or steps (replace steps if provided)
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { programId, workoutId } = await params;

  const { supabase, errorResponse } = await getProgramMemberOrError(req, programId);
  if (errorResponse) return errorResponse;

  const json = await req.json().catch(() => null);
  const parsed = updateWorkoutSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { label, steps } = parsed.data;

  if (!label && !steps) {
    return NextResponse.json(
      { error: "No fields to update" },
      { status: 400 }
    );
  }

  if (label) {
    const { error: labelError } = await supabase
      .from("workouts")
      .update({ label })
      .eq("id", workoutId)
      .eq("program_id", programId);

    if (labelError) {
      console.error("[PATCH workout] update label error", labelError);
      return NextResponse.json(
        { error: "Failed to update workout" },
        { status: 500 }
      );
    }
  }

  let updatedSteps: any[] = [];

  if (steps) {
    // Replace strategy: delete existing steps, insert new ordered set
    const { error: deleteError } = await supabase
      .from("workout_steps")
      .delete()
      .eq("workout_id", workoutId);

    if (deleteError) {
      console.error("[PATCH workout] delete steps error", deleteError);
      return NextResponse.json(
        { error: "Failed to update workout steps" },
        { status: 500 }
      );
    }

    const stepRows = steps.map((step, index) => ({
      workout_id: workoutId,
      step_index: index + 1,
      training_event_template_id: step.trainingEventTemplateId,
      label: step.label,
    }));

    const { data: insertedSteps, error: insertError } = await supabase
      .from("workout_steps")
      .insert(stepRows)
      .select("id, workout_id, step_index, training_event_template_id, label")
      .order("step_index", { ascending: true });

    if (insertError) {
      console.error("[PATCH workout] insert steps error", insertError);
      return NextResponse.json(
        { error: "Failed to update workout steps" },
        { status: 500 }
      );
    }

    updatedSteps = insertedSteps ?? [];
  }

  // Return latest snapshot
  const { data: workout, error: workoutError } = await supabase
    .from("workouts")
    .select("id, program_id, label, created_at")
    .eq("id", workoutId)
    .eq("program_id", programId)
    .maybeSingle();

  if (workoutError || !workout) {
    console.error("[PATCH workout] reload error", workoutError);
    return NextResponse.json(
      { error: "Failed to reload workout" },
      { status: 500 }
    );
  }

  if (!steps) {
    const { data: freshSteps } = await supabase
      .from("workout_steps")
      .select("id, workout_id, step_index, training_event_template_id, label")
      .eq("workout_id", workoutId)
      .order("step_index", { ascending: true });

    updatedSteps = freshSteps ?? [];
  }

  return NextResponse.json(
    {
      workout: {
        ...workout,
        steps: updatedSteps,
      },
    },
    { status: 200 }
  );
}

// DELETE: delete workout + steps
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { programId, workoutId } = await params;

  const { supabase, errorResponse } = await getProgramMemberOrError(req, programId);
  if (errorResponse) return errorResponse;

  const { error: stepsError } = await supabase
    .from("workout_steps")
    .delete()
    .eq("workout_id", workoutId);

  if (stepsError) {
    console.error("[DELETE workout] delete steps error", stepsError);
    return NextResponse.json(
      { error: "Failed to delete workout steps" },
      { status: 500 }
    );
  }

  const { error: workoutError } = await supabase
    .from("workouts")
    .delete()
    .eq("id", workoutId)
    .eq("program_id", programId);

  if (workoutError) {
    console.error("[DELETE workout] delete workout error", workoutError);
    return NextResponse.json(
      { error: "Failed to delete workout" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}