// app/api/programs/[programId]/training/exercises/[exerciseId]/clone/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";

const paramsSchema = z.object({
  programId: z.string().uuid(),
  exerciseId: z.string().uuid(),
});

/**
 * POST /api/programs/:programId/training/exercises/:exerciseId/clone
 * Clones a SYSTEM exercise (global) into the program so it can be edited.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ programId: string; exerciseId: string }> }
) {
  try {
    const rawParams = await ctx.params;
    const parsedParams = paramsSchema.safeParse(rawParams);
    if (!parsedParams.success) {
      return NextResponse.json({ error: "Invalid params" }, { status: 400 });
    }

    const { programId, exerciseId } = parsedParams.data;
    const { supabase } = await supabaseServer(req);

    // Auth
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Map auth user -> app user (public.users)
    const { data: appUser, error: appUserErr } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (appUserErr) {
      return NextResponse.json({ error: appUserErr.message }, { status: 500 });
    }
    if (!appUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Program membership gate (program_members.user_id references public.users.id)
    const { data: membership, error: memberErr } = await supabase
      .from("program_members")
      .select("id")
      .eq("program_id", programId)
      .eq("user_id", appUser.id)
      .maybeSingle();

    if (memberErr) {
      return NextResponse.json({ error: memberErr.message }, { status: 500 });
    }
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch the source exercise (must be system/global)
    const { data: source, error: sourceErr } = await supabase
      .from("training_exercises")
      .select(
        "id, program_id, label, description, workout_category, measurement_unit, tags, metadata, is_active"
      )
      .eq("id", exerciseId)
      .maybeSingle();

    if (sourceErr) {
      return NextResponse.json({ error: sourceErr.message }, { status: 500 });
    }
    if (!source) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }

    // System exercises are identified by NULL program_id
    if (source.program_id) {
      return NextResponse.json(
        { error: "Only system exercises can be cloned" },
        { status: 400 }
      );
    }

    const baseMeta =
      source.metadata && typeof source.metadata === "object" ? source.metadata : {};

    const clonedMeta = {
      ...baseMeta,
      source_exercise_id: source.id,
    };

    // Insert the cloned program-owned exercise
    const { data: inserted, error: insertErr } = await supabase
      .from("training_exercises")
      .insert({
        program_id: programId,
        label: source.label,
        description: source.description,
        workout_category: source.workout_category,
        measurement_unit: source.measurement_unit,
        tags: source.tags ?? [],
        metadata: clonedMeta,
        is_active: source.is_active ?? true,
      })
      .select("*")
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ exercise: inserted }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
