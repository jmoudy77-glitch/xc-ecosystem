// app/api/programs/[programId]/training/workouts/[workoutId]/steps/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";

const createStepBodySchema = z.object({
  // Prefer exercise_id now that we have the exercise catalog
  exercise_id: z.string().uuid().optional(),
  // Keep template id optional for backward compatibility / renderer-type usage
  training_event_template_id: z.string().uuid().optional(),
  label: z.string().optional().nullable(),
  parameters_override: z.record(z.string(), z.any()).optional().nullable(),
});

const patchBodySchema = z.object({
  // Bulk patch/reorder
  steps: z
    .array(
      z.object({
        id: z.string().uuid(),
        step_index: z.number().int().min(0).optional(),
        exercise_id: z.string().uuid().nullable().optional(),
        training_event_template_id: z.string().uuid().nullable().optional(),
        label: z.string().nullable().optional(),
        parameters_override: z.record(z.string(), z.any()).nullable().optional(),
      }),
    )
    .min(1),
});

const deleteQuerySchema = z.object({
  stepId: z.string().uuid(),
});

async function requireProgramMember(
  req: NextRequest,
  programId: string,
): Promise<{ supabase: any; appUserId: string; programMemberId: string }> {
  const { supabase } = supabaseServer(req);

  const {
    data: { user: authUser },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !authUser) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }

  const { data: appUser, error: appUserErr } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", authUser.id)
    .single();

  if (appUserErr || !appUser?.id) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }

  const { data: pm, error: pmErr } = await supabase
    .from("program_members")
    .select("id")
    .eq("program_id", programId)
    .eq("user_id", appUser.id)
    .single();

  if (pmErr || !pm?.id) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }

  return { supabase, appUserId: appUser.id, programMemberId: pm.id };
}

async function getWorkoutMetaOr404(supabase: any, programId: string, workoutId: string) {
  const { data, error } = await supabase
    .from("workouts")
    .select("id, program_id, is_system_template")
    .eq("id", workoutId)
    .eq("program_id", programId)
    .single();

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    throw Object.assign(new Error(status === 404 ? "Not found" : error.message), { status });
  }
  return data;
}

async function listSteps(supabase: any, workoutId: string) {
  const { data, error } = await supabase
    .from("workout_steps")
    .select(
      "id, workout_id, step_index, exercise_id, training_event_template_id, label, parameters_override, created_at",
    )
    .eq("workout_id", workoutId)
    .order("step_index", { ascending: true });

  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  return data ?? [];
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ programId: string; workoutId: string }> },
) {
  try {
    const { programId, workoutId } = await ctx.params;
    const { supabase } = await requireProgramMember(req, programId);

    // Ensure workout exists + belongs to program
    await getWorkoutMetaOr404(supabase, programId, workoutId);

    const steps = await listSteps(supabase, workoutId);
    return NextResponse.json({ steps }, { status: 200 });
  } catch (e: any) {
    const status = typeof e?.status === "number" ? e.status : 500;
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status });
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ programId: string; workoutId: string }> },
) {
  try {
    const { programId, workoutId } = await ctx.params;

    const body = await req.json().catch(() => null);
    const parsed = createStepBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { supabase } = await requireProgramMember(req, programId);

    const workout = await getWorkoutMetaOr404(supabase, programId, workoutId);
    if (workout.is_system_template) {
      return NextResponse.json(
        { error: "Forbidden: Global workouts are read-only" },
        { status: 403 },
      );
    }

    if (!parsed.data.exercise_id && !parsed.data.training_event_template_id) {
      return NextResponse.json(
        { error: "Provide either exercise_id or training_event_template_id" },
        { status: 400 },
      );
    }

    // Determine next step_index
    const { data: lastStep, error: lastErr } = await supabase
      .from("workout_steps")
      .select("step_index")
      .eq("workout_id", workoutId)
      .order("step_index", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastErr) {
      return NextResponse.json({ error: lastErr.message }, { status: 500 });
    }
    const nextIndex = (lastStep?.step_index ?? -1) + 1;

    const insertPayload: any = {
      workout_id: workoutId,
      step_index: nextIndex,
      exercise_id: parsed.data.exercise_id ?? null,
      training_event_template_id: parsed.data.training_event_template_id ?? null,
      label: parsed.data.label ?? null,
      parameters_override: parsed.data.parameters_override ?? {},
    };

    const { data: step, error } = await supabase
      .from("workout_steps")
      .insert(insertPayload)
      .select(
        "id, workout_id, step_index, exercise_id, training_event_template_id, label, parameters_override, created_at",
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const steps = await listSteps(supabase, workoutId);
    return NextResponse.json({ step, steps }, { status: 201 });
  } catch (e: any) {
    const status = typeof e?.status === "number" ? e.status : 500;
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status });
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ programId: string; workoutId: string }> },
) {
  try {
    const { programId, workoutId } = await ctx.params;

    const body = await req.json().catch(() => null);
    const parsed = patchBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { supabase } = await requireProgramMember(req, programId);

    const workout = await getWorkoutMetaOr404(supabase, programId, workoutId);
    if (workout.is_system_template) {
      return NextResponse.json(
        { error: "Forbidden: Global workouts are read-only" },
        { status: 403 },
      );
    }

    // Apply updates sequentially (Supabase REST has no true txn here)
    for (const s of parsed.data.steps) {
      const updates: any = {};
      if (typeof s.step_index === "number") updates.step_index = s.step_index;
      if ("exercise_id" in s) updates.exercise_id = s.exercise_id ?? null;
      if ("training_event_template_id" in s)
        updates.training_event_template_id = s.training_event_template_id ?? null;
      if ("label" in s) updates.label = s.label ?? null;
      if ("parameters_override" in s) updates.parameters_override = s.parameters_override ?? {};

      const { error } = await supabase
        .from("workout_steps")
        .update(updates)
        .eq("id", s.id)
        .eq("workout_id", workoutId);

      if (error) {
        return NextResponse.json(
          { error: `Failed updating step ${s.id}: ${error.message}` },
          { status: 500 },
        );
      }
    }

    const steps = await listSteps(supabase, workoutId);
    return NextResponse.json({ steps }, { status: 200 });
  } catch (e: any) {
    const status = typeof e?.status === "number" ? e.status : 500;
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ programId: string; workoutId: string }> },
) {
  try {
    const { programId, workoutId } = await ctx.params;

    const parsed = deleteQuerySchema.safeParse(
      Object.fromEntries(new URL(req.url).searchParams),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { supabase } = await requireProgramMember(req, programId);

    const workout = await getWorkoutMetaOr404(supabase, programId, workoutId);
    if (workout.is_system_template) {
      return NextResponse.json(
        { error: "Forbidden: Global workouts are read-only" },
        { status: 403 },
      );
    }

    const { error: delErr } = await supabase
      .from("workout_steps")
      .delete()
      .eq("id", parsed.data.stepId)
      .eq("workout_id", workoutId);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    // Re-index remaining steps to keep ordering stable (0..n-1)
    const steps = await listSteps(supabase, workoutId);
    for (let i = 0; i < steps.length; i++) {
      const s: any = steps[i];
      if (s.step_index === i) continue;
      const { error } = await supabase
        .from("workout_steps")
        .update({ step_index: i })
        .eq("id", s.id)
        .eq("workout_id", workoutId);
      if (error) {
        return NextResponse.json(
          { error: `Failed reindexing steps: ${error.message}` },
          { status: 500 },
        );
      }
    }

    const refreshed = await listSteps(supabase, workoutId);
    return NextResponse.json({ ok: true, steps: refreshed }, { status: 200 });
  } catch (e: any) {
    const status = typeof e?.status === "number" ? e.status : 500;
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status });
  }
}
