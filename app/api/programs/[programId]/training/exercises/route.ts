

// app/api/programs/[programId]/training/exercises/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";

const scopeSchema = z.enum(["all", "program", "system"]).default("all");
const categorySchema = z.enum(["run", "gym", "cross_training", "other"]);
const boolStringSchema = z.enum(["true", "false"]);

const listQuerySchema = z.object({
  scope: scopeSchema.optional(),
  category: categorySchema.optional(),
  q: z.string().trim().min(1).optional(),
  active: boolStringSchema.optional(),
});

const createBodySchema = z.object({
  label: z.string().trim().min(1),
  description: z.string().trim().min(1).optional().nullable(),
  workoutCategory: categorySchema,
  measurementUnit: z.enum(["meters", "seconds", "reps", "mixed", "none"]),
  tags: z.array(z.string().trim().min(1)).optional().default([]),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

async function requireProgramMember(supabase: any, programId: string) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  }

  // Map auth user -> app user (public.users.auth_id)
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
  { params }: { params: Promise<{ programId: string }> },
) {
  const { programId } = await params;
  const { supabase } = supabaseServer(req);

  const membership = await requireProgramMember(supabase, programId);
  if (!membership.ok) {
    return NextResponse.json({ error: membership.error }, { status: membership.status });
  }

  const parsed = listQuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query", details: parsed.error.flatten() }, { status: 400 });
  }

  const scope = parsed.data.scope ?? "all";
  const category = parsed.data.category;
  const q = parsed.data.q;
  const active = parsed.data.active ? parsed.data.active === "true" : true;

  let query = supabase
    .from("training_exercises")
    .select(
      "id, program_id, label, description, workout_category, measurement_unit, tags, is_active, metadata, created_at, updated_at",
    )
    .order("label", { ascending: true });

  if (active) query = query.eq("is_active", true);

  if (scope === "program") {
    query = query.eq("program_id", programId);
  } else if (scope === "system") {
    query = query.is("program_id", null);
  } else {
    // all = program-owned + system
    query = query.or(`program_id.eq.${programId},program_id.is.null`);
  }

  if (category) query = query.eq("workout_category", category);
  if (q) query = query.ilike("label", `%${q}%`);

  const { data, error } = await query;
  if (error) {
    console.error("[training/exercises][GET] error:", error);
    return NextResponse.json({ error: "Failed to load exercises" }, { status: 500 });
  }

  return NextResponse.json({ exercises: data ?? [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ programId: string }> },
) {
  const { programId } = await params;
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

  const parsed = createBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const insertRow = {
    program_id: programId,
    label: parsed.data.label,
    description: parsed.data.description ?? null,
    workout_category: parsed.data.workoutCategory,
    measurement_unit: parsed.data.measurementUnit,
    tags: parsed.data.tags,
    metadata: parsed.data.metadata,
    is_active: true,
  };

  const { data, error } = await supabase
    .from("training_exercises")
    .insert(insertRow)
    .select(
      "id, program_id, label, description, workout_category, measurement_unit, tags, is_active, metadata, created_at, updated_at",
    )
    .single();

  if (error) {
    console.error("[training/exercises][POST] error:", error);
    return NextResponse.json({ error: "Failed to create exercise" }, { status: 500 });
  }

  return NextResponse.json({ exercise: data }, { status: 201 });
}