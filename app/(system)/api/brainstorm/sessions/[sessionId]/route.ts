// app/api/brainstorm/sessions/[sessionId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { supabase } = await supabaseServer(req);
  const { sessionId } = await params;

  const { data, error } = await supabase
    .from("brainstorm_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { supabase } = await supabaseServer(req);
  const { sessionId } = await params;

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, any> = {};

  if (typeof body?.title === "string") patch.title = body.title;
  if (typeof body?.status === "string") patch.status = body.status;
  if (body?.team_id !== undefined) patch.team_id = body.team_id;

  const { data, error } = await supabase
    .from("brainstorm_sessions")
    .update(patch)
    .eq("id", sessionId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { supabase } = await supabaseServer(req);
  const { sessionId } = await params;

  const { error } = await supabase
    .from("brainstorm_sessions")
    .delete()
    .eq("id", sessionId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}