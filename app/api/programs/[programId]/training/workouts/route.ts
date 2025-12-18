// app/api/programs/[programId]/training/workouts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";

const listQuerySchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const createBodySchema = z.object({
  label: z.string().min(1, "Label is required"),
  description: z.string().optional().nullable(),
});

async function requireProgramMember(
  req: NextRequest,
  programId: string,
): Promise<{ supabase: any; appUserId: string; programMemberId: string }> {
  const { supabase } = supabaseServer(req);

  // 1) Get authed user
  const {
    data: { user: authUser },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !authUser) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }

  // 2) Map auth user -> public.users.id
  const { data: appUser, error: appUserErr } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", authUser.id)
    .single();

  if (appUserErr || !appUser?.id) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }

  // 3) Confirm program membership + get program_member_id (needed for created_by fields)
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

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ programId: string }> },
) {
  try {
    const { programId } = await ctx.params;

    const parsed = listQuerySchema.safeParse(
      Object.fromEntries(new URL(req.url).searchParams),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { supabase } = await requireProgramMember(req, programId);

    const limit = parsed.data.limit ?? 50;
    const offset = parsed.data.offset ?? 0;
    const q = parsed.data.q?.trim();

    const baseSelect =
      "id, program_id, label, description, is_system_template, created_by_program_member_id, created_at, updated_at, workout_steps(count)";

    // 1) Program workouts
    let programQuery = supabase
      .from("workouts")
      .select(baseSelect)
      .eq("program_id", programId)
      .order("updated_at", { ascending: false });

    if (q) {
      programQuery = programQuery.or(`label.ilike.%${q}%,description.ilike.%${q}%`);
    }

    const { data: programData, error: programErr } = await programQuery;
    if (programErr) {
      return NextResponse.json({ error: programErr.message }, { status: 500 });
    }

    // 2) Global workouts (shared across programs)
    let globalQuery = supabase
      .from("workouts")
      .select(baseSelect)
      .eq("is_system_template", true)
      .order("updated_at", { ascending: false });

    if (q) {
      globalQuery = globalQuery.or(`label.ilike.%${q}%,description.ilike.%${q}%`);
    }

    const { data: globalData, error: globalErr } = await globalQuery;
    if (globalErr) {
      return NextResponse.json({ error: globalErr.message }, { status: 500 });
    }

    // Normalize step count for the client
    const normalize = (rows: any[]) =>
      (rows ?? []).map((w: any) => ({
        ...w,
        step_count: Array.isArray(w.workout_steps) ? w.workout_steps?.[0]?.count ?? 0 : 0,
      }));

    const merged = [...normalize(programData ?? []), ...normalize(globalData ?? [])];

    // Sort merged list by updated_at desc (server returns strings)
    merged.sort((a: any, b: any) => {
      const at = a?.updated_at ? Date.parse(a.updated_at) : 0;
      const bt = b?.updated_at ? Date.parse(b.updated_at) : 0;
      return bt - at;
    });

    const paged = merged.slice(offset, offset + limit);

    return NextResponse.json({ workouts: paged }, { status: 200 });
  } catch (e: any) {
    const status = typeof e?.status === "number" ? e.status : 500;
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status });
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ programId: string }> },
) {
  try {
    const { programId } = await ctx.params;

    const body = await req.json().catch(() => null);
    const parsed = createBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { supabase, programMemberId } = await requireProgramMember(req, programId);

    const payload = {
      program_id: programId,
      label: parsed.data.label.trim(),
      description: parsed.data.description ?? null,
      is_system_template: false,
      created_by_program_member_id: programMemberId,
    };

    const { data, error } = await supabase
      .from("workouts")
      .insert(payload)
      .select(
        "id, program_id, label, description, is_system_template, created_by_program_member_id, created_at, updated_at",
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ workout: data }, { status: 201 });
  } catch (e: any) {
    const status = typeof e?.status === "number" ? e.status : 500;
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status });
  }
}
