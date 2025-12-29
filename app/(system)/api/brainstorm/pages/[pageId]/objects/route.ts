// app/(system)/api/brainstorm/pages/[pageId]/objects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function error(status: number, message: string, extra?: any) {
  return NextResponse.json(
    { error: message, ...(extra ? { extra } : {}) },
    { status }
  );
}

type CreateObjectBody = {
  object_type: string;
  payload_json?: Record<string, any>;
  x?: number;
  y?: number;
  width?: number | null;
  height?: number | null;
  z_index?: number;
};

/**
 * GET
 * Returns all objects for a brainstorm page, ordered by z_index then created_at.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  const { pageId } = await params;
  const { supabase } = await supabaseServer(req);

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return error(401, "Unauthorized");

  const { data, error: dbErr } = await supabase
    .from("brainstorm_objects")
    .select("*")
    .eq("page_id", pageId)
    .order("z_index", { ascending: true })
    .order("created_at", { ascending: true });

  if (dbErr) {
    return error(500, "Failed to load brainstorm objects", { supabase: dbErr });
  }

  return NextResponse.json({ data });
}

/**
 * POST
 * Creates a new object for a brainstorm page.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  const { pageId } = await params;
  const { supabase } = await supabaseServer(req);

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return error(401, "Unauthorized");

  let body: CreateObjectBody;
  try {
    body = (await req.json()) as CreateObjectBody;
  } catch {
    return error(400, "Invalid JSON body");
  }

  const object_type = body.object_type;
  if (!object_type) return error(400, "object_type is required");

  const payload_json = body.payload_json ?? {};
  const x = typeof body.x === "number" ? body.x : 24;
  const y = typeof body.y === "number" ? body.y : 24;
  const width = typeof body.width === "number" || body.width === null ? body.width : null;
  const height = typeof body.height === "number" || body.height === null ? body.height : null;
  const z_index = typeof body.z_index === "number" ? body.z_index : 0;

  const { data: created, error: createErr } = await supabase
    .from("brainstorm_objects")
    .insert({
      page_id: pageId,
      object_type,
      payload_json,
      x,
      y,
      width,
      height,
      z_index,
      created_by_user_id: auth.user.id,
    })
    .select("*")
    .single();

  if (createErr) {
    return error(500, "Failed to create brainstorm object", { supabase: createErr });
  }

  return NextResponse.json({ data: created }, { status: 201 });
}