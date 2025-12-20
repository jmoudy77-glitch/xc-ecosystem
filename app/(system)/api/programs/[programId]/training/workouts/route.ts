// /Users/joshmoudy/Library/CloudStorage/GoogleDrive-jmoudy77@gmail.com/My Drive/Ecosystem_Live/xc-ecosystem/app/api/programs/[programId]/training/workouts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";

const listQuerySchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  include_archived: z.coerce.boolean().optional(),
  mode: z.string().optional(),
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
    const includeArchived = parsed.data.include_archived === true;
    const mode = parsed.data.mode?.trim();

    const baseSelect =
      "id, program_id, label, description, is_system_template, archived_at, created_by_program_member_id, created_at, updated_at, workout_steps(count)";

    // Helpers for duplicate detection
    const normalizeLabel = (s: any) =>
      String(s ?? "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");

    const stableStringify = (obj: any): string => {
      if (obj === null || obj === undefined) return "null";
      if (typeof obj !== "object") return JSON.stringify(obj);
      if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(",")}]`;
      const keys = Object.keys(obj).sort();
      return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
    };

    const stepSig = (st: any) => {
      const kind = st.exercise_id
        ? `ex:${st.exercise_id}`
        : st.training_event_template_id
          ? `tpl:${st.training_event_template_id}`
          : "none";
      const lbl = st.label ? `lbl:${normalizeLabel(st.label)}` : "";
      const params = st.parameters_override ? stableStringify(st.parameters_override) : "null";
      return `${st.step_index}|${kind}|${lbl}|params:${params}`;
    };

    const workoutSignature = (w: any) => {
      const labelNorm = normalizeLabel(w.label);
      const steps = Array.isArray(w.workout_steps) ? w.workout_steps.slice() : [];
      steps.sort((a: any, b: any) => (a.step_index ?? 0) - (b.step_index ?? 0));
      return `label:${labelNorm}||steps:${steps.map(stepSig).join("||")}`;
    };

    // Duplicates mode
    if (mode === "duplicates") {
      // Program-owned workouts only (non-system). Include steps for signature.
      const dupSelect =
        "id, program_id, label, description, is_system_template, archived_at, updated_at, created_at, workout_steps(step_index, exercise_id, training_event_template_id, label, parameters_override)";

      let dupQuery = supabase
        .from("workouts")
        .select(dupSelect)
        .eq("program_id", programId)
        .eq("is_system_template", false)
        .order("updated_at", { ascending: false });

      if (!includeArchived) {
        dupQuery = dupQuery.is("archived_at", null);
      }

      if (q) {
        dupQuery = dupQuery.or(`label.ilike.%${q}%,description.ilike.%${q}%`);
      }

      const { data: dupData, error: dupErr } = await dupQuery;
      if (dupErr) {
        return NextResponse.json({ error: dupErr.message }, { status: 500 });
      }

      const bySig = new Map<string, any[]>();
      for (const w of dupData ?? []) {
        const sig = workoutSignature(w);
        const arr = bySig.get(sig) ?? [];
        arr.push({
          id: w.id,
          label: w.label,
          description: w.description,
          archived_at: (w as any).archived_at ?? null,
          updated_at: w.updated_at,
          created_at: w.created_at,
          step_count: Array.isArray((w as any).workout_steps) ? (w as any).workout_steps.length : 0,
        });
        bySig.set(sig, arr);
      }

      const groups = Array.from(bySig.entries())
        .filter(([, items]) => items.length > 1)
        .map(([signature, items]) => ({ signature, items }));

      // Sort groups by size desc, then by most recent updated_at desc
      groups.sort((a, b) => {
        const size = (b.items?.length ?? 0) - (a.items?.length ?? 0);
        if (size !== 0) return size;
        const aMax = Math.max(...a.items.map((i: any) => (i.updated_at ? Date.parse(i.updated_at) : 0)));
        const bMax = Math.max(...b.items.map((i: any) => (i.updated_at ? Date.parse(i.updated_at) : 0)));
        return bMax - aMax;
      });

      return NextResponse.json({ groups }, { status: 200 });
    }

    // 1) Program workouts
    let programQuery = supabase
      .from("workouts")
      .select(baseSelect)
      .eq("program_id", programId)
      .order("updated_at", { ascending: false });

    if (!includeArchived) {
      programQuery = programQuery.is("archived_at", null);
    }

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

    if (!includeArchived) {
      globalQuery = globalQuery.is("archived_at", null);
    }

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
