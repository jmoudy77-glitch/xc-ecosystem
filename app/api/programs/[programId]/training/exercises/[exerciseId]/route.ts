

// app/api/programs/[programId]/training/exercises/[exerciseId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";

const categorySchema = z.enum(["run", "gym", "cross_training", "other"]);

const patchBodySchema = z.object({
  label: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).nullable().optional(),
  workoutCategory: categorySchema.optional(),
  measurementUnit: z.enum(["meters", "seconds", "reps", "mixed", "none"]).optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  isActive: z.boolean().optional(),
});

async function requireProgramMember(supabase: any, programId: string) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (appUserError || !appUser?.id) {
    return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  }

  const { data: member, error: memberError } = await supabase
    .from("program_members")
    .select("id")
    .eq("program_id", programId)
    .eq("user_id", appUser.id)
    .maybeSingle();

  if (memberError) {
    return { ok: false as const, status: 500 as const, error: "Failed to verify program membership" };
  }

  if (!member?.id) {
    return { ok: false as const, status: 403 as const, error: "Forbidden" };
  }

  return { ok: true as const, userId: appUser.id, memberId: member.id };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ programId: string; exerciseId: string }> },
) {
  const { programId, exerciseId } = await params;
  const { supabase } = supabaseServer(req);

  const membership = await requireProgramMember(supabase, programId);
  if (!membership.ok) {
    return NextResponse.json({ error: membership.error }, { status: membership.status });
  }

  const { data, error } = await supabase
    .from("training_exercises")
    .select(
      "id, program_id, label, description, workout_category, measurement_unit, tags, is_active, metadata, created_at, updated_at",
    )
    .eq("id", exerciseId)
    .or(`program_id.eq.${programId},program_id.is.null`)
    .maybeSingle();

  if (error) {
    console.error("[training/exercises/:id][GET] error:", error);
    return NextResponse.json({ error: "Failed to load exercise" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ exercise: data });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ programId: string; exerciseId: string }> },
) {
  const { programId, exerciseId } = await params;
  const { supabase } = supabaseServer(req);

  const membership = await requireProgramMember(supabase, programId);
  if (!membership.ok) {
    return NextResponse.json({ error: membership.error }, { status: membership.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = patchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  // Ensure this is a program-owned exercise (system exercises are read-only)
  const { data: existing, error: fetchError } = await supabase
    .from("training_exercises")
    .select("id, program_id")
    .eq("id", exerciseId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: "Failed to load exercise" }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.program_id !== programId) {
    return NextResponse.json({ error: "Cannot modify system exercise" }, { status: 403 });
  }

  const update: Record<string, any> = {};
  if (parsed.data.label !== undefined) update.label = parsed.data.label;
  if (parsed.data.description !== undefined) update.description = parsed.data.description;
  if (parsed.data.workoutCategory !== undefined) update.workout_category = parsed.data.workoutCategory;
  if (parsed.data.measurementUnit !== undefined) update.measurement_unit = parsed.data.measurementUnit;
  if (parsed.data.tags !== undefined) update.tags = parsed.data.tags;
  if (parsed.data.metadata !== undefined) update.metadata = parsed.data.metadata;
  if (parsed.data.isActive !== undefined) update.is_active = parsed.data.isActive;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("training_exercises")
    .update(update)
    .eq("id", exerciseId)
    .select(
      "id, program_id, label, description, workout_category, measurement_unit, tags, is_active, metadata, created_at, updated_at",
    )
    .single();

  if (error) {
    console.error("[training/exercises/:id][PATCH] error:", error);
    return NextResponse.json({ error: "Failed to update exercise" }, { status: 500 });
  }

  return NextResponse.json({ exercise: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ programId: string; exerciseId: string }> },
) {
  const { programId, exerciseId } = await params;
  const { supabase } = supabaseServer(req);

  const membership = await requireProgramMember(supabase, programId);
  if (!membership.ok) {
    return NextResponse.json({ error: membership.error }, { status: membership.status });
  }

  // Soft delete (program-owned only)
  const { data: existing, error: fetchError } = await supabase
    .from("training_exercises")
    .select("id, program_id")
    .eq("id", exerciseId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: "Failed to load exercise" }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.program_id !== programId) {
    return NextResponse.json({ error: "Cannot delete system exercise" }, { status: 403 });
  }

  const { error } = await supabase
    .from("training_exercises")
    .update({ is_active: false })
    .eq("id", exerciseId);

  if (error) {
    console.error("[training/exercises/:id][DELETE] error:", error);
    return NextResponse.json({ error: "Failed to delete exercise" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}