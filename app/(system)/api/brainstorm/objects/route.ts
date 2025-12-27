// app/(system)/api/brainstorm/objects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";

async function getProgramMemberOrError(req: NextRequest, programId: string) {
  const { supabase } = supabaseServer(req);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      user: null,
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
      user,
      programMember: null,
      errorResponse: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { supabase, user, programMember, errorResponse: null };
}

const listSchema = z.object({
  program_id: z.string().uuid(),
  page_id: z.string().uuid(),
});

// Keep this permissive; we can tighten per object_type once the renderer stabilizes.
const createSchema = z.object({
  program_id: z.string().uuid(),
  page_id: z.string().uuid(),
  object_type: z.string().min(1),
  payload_json: z.record(z.string(), z.any()).default({}),
  x: z.number(),
  y: z.number(),
  width: z.number().nullable().optional().default(null),
  height: z.number().nullable().optional().default(null),
  z_index: z.number().int().optional().default(0),
});

// GET /api/brainstorm/objects?program_id=...&page_id=...
// Returns all objects for a page (whiteboard snapshot)
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const program_id = url.searchParams.get("program_id");
  const page_id = url.searchParams.get("page_id");

  const parsed = listSchema.safeParse({ program_id, page_id });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { program_id: programId, page_id: pageId } = parsed.data;

  const { supabase, errorResponse } = await getProgramMemberOrError(req, programId);
  if (errorResponse) return errorResponse;

  const { data, error } = await supabase
    .from("brainstorm_objects")
    .select(
      "id, program_id, page_id, object_type, payload_json, x, y, width, height, z_index, created_at, created_by_user_id, updated_at"
    )
    .eq("program_id", programId)
    .eq("page_id", pageId)
    .order("z_index", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[brainstorm objects][GET] error", error);
    return NextResponse.json({ error: "Failed to load objects" }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] }, { status: 200 });
}

// POST /api/brainstorm/objects
// Body: { program_id, page_id, object_type, payload_json, x, y, width?, height?, z_index? }
export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { program_id: programId, ...rest } = parsed.data;

  const { supabase, user, errorResponse } = await getProgramMemberOrError(req, programId);
  if (errorResponse) return errorResponse;

  const { data: inserted, error } = await supabase
    .from("brainstorm_objects")
    .insert({
      program_id: programId,
      page_id: rest.page_id,
      object_type: rest.object_type,
      payload_json: rest.payload_json,
      x: rest.x,
      y: rest.y,
      width: rest.width ?? null,
      height: rest.height ?? null,
      z_index: rest.z_index ?? 0,
      created_by_user_id: user!.id,
    })
    .select(
      "id, program_id, page_id, object_type, payload_json, x, y, width, height, z_index, created_at, created_by_user_id, updated_at"
    )
    .single();

  if (error || !inserted) {
    console.error("[brainstorm objects][POST] error", error);
    return NextResponse.json({ error: "Failed to create object" }, { status: 500 });
  }

  return NextResponse.json({ data: inserted }, { status: 201 });
}
