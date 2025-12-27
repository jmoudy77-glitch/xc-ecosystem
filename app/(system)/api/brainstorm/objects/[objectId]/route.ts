// app/(system)/api/brainstorm/objects/[objectId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function error(status: number, message: string, extra?: any) {
  return NextResponse.json(
    { error: message, ...(extra ? { extra } : {}) },
    { status }
  );
}

/**
 * GET
 * Returns a single whiteboard object by id.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ objectId: string }> }
) {
  const { objectId } = await params;
  const { supabase } = supabaseServer(req);

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return error(401, "Unauthorized");

  const { data, error: dbErr } = await supabase
    .from("brainstorm_objects")
    .select("*")
    .eq("id", objectId)
    .single();

  if (dbErr) {
    return error(404, "Brainstorm object not found", { supabase: dbErr });
  }

  return NextResponse.json({ data });
}

/**
 * PATCH
 * Updates position, size, z-index, or payload of an existing object.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ objectId: string }> }
) {
  const { objectId } = await params;
  const { supabase } = supabaseServer(req);

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return error(401, "Unauthorized");

  const body = await req.json();

  const update: Record<string, any> = {};

  if (typeof body.x === "number") update.x = body.x;
  if (typeof body.y === "number") update.y = body.y;
  if (typeof body.width === "number" || body.width === null) update.width = body.width;
  if (typeof body.height === "number" || body.height === null) update.height = body.height;
  if (typeof body.z_index === "number") update.z_index = body.z_index;
  if (typeof body.payload_json === "object") update.payload_json = body.payload_json;

  if (Object.keys(update).length === 0) {
    return error(400, "No valid fields provided for update");
  }

  const { data: updated, error: updateErr } = await supabase
    .from("brainstorm_objects")
    .update(update)
    .eq("id", objectId)
    .select("*")
    .single();

  if (updateErr) {
    return error(500, "Failed to update brainstorm object", {
      supabase: updateErr,
    });
  }

  return NextResponse.json({ data: updated });
}

/**
 * DELETE
 * Removes a whiteboard object permanently.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ objectId: string }> }
) {
  const { objectId } = await params;
  const { supabase } = supabaseServer(req);

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return error(401, "Unauthorized");

  const { error: deleteErr } = await supabase
    .from("brainstorm_objects")
    .delete()
    .eq("id", objectId);

  if (deleteErr) {
    return error(500, "Failed to delete brainstorm object", {
      supabase: deleteErr,
    });
  }

  return NextResponse.json({ success: true });
}