// app/api/brainstorm/sessions/[sessionId]/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function error(status: number, message: string, extra?: any) {
  return NextResponse.json(
    { error: message, ...(extra ? { extra } : {}) },
    { status }
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string } >}
) {
  const { sessionId } = await params;
  const { supabase } = supabaseServer(req);

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return error(401, "Unauthorized");

  const { data, error: dbErr } = await supabase
    .from("brainstorm_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (dbErr) {
    return error(500, "Failed to load brainstorm messages", { supabase: dbErr });
  }

  return NextResponse.json({ data });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const { supabase } = supabaseServer(req);

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return error(401, "Unauthorized");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return error(400, "Invalid JSON body");
  }

  const role: "coach" | "ai" | undefined = body.role;
  const content: string | undefined = body.content;

  if (!role) return error(400, "Missing required field: role");
  if (!content || !content.trim())
    return error(400, "Missing or empty field: content");

  const insertPayload = {
    session_id: sessionId,
    role,
    content,
    created_by_user_id: auth.user.id,
  };

  const { data, error: dbErr } = await supabase
    .from("brainstorm_messages")
    .insert(insertPayload)
    .select("*")
    .single();

  if (dbErr) {
    return error(500, "Failed to append brainstorm message", {
      supabase: dbErr,
    });
  }

  return NextResponse.json({ data }, { status: 201 });
}