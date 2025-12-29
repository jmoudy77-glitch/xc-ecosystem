// app/api/brainstorm/sessions/[sessionId]/index-items/route.ts
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
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const { supabase } = await supabaseServer(req);

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return error(401, "Unauthorized");

  const { data, error: dbErr } = await supabase
    .from("brainstorm_index_items")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (dbErr) {
    return error(500, "Failed to load index items", { supabase: dbErr });
  }

  return NextResponse.json({ data });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string } >}
) {
  const { sessionId } = await params;
  const { supabase } = await supabaseServer(req);

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return error(401, "Unauthorized");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return error(400, "Invalid JSON body");
  }

  const type: string | undefined = body.type;
  const label: string | undefined = body.label;
  const confidence: number | undefined = body.confidence;
  const message_id: string | null = body.message_id ?? null;
  const object_id: string | null = body.object_id ?? null;
  const metadata = body.metadata ?? {};

  if (!type) return error(400, "Missing required field: type");
  if (!label || !label.trim())
    return error(400, "Missing or empty field: label");

  if (
    confidence !== undefined &&
    (typeof confidence !== "number" || confidence < 0 || confidence > 1)
  ) {
    return error(400, "confidence must be a number between 0 and 1");
  }

  const insertPayload = {
    session_id: sessionId,
    type,
    label,
    confidence,
    message_id,
    object_id,
    metadata,
    created_by: "ai",
  };

  const { data, error: dbErr } = await supabase
    .from("brainstorm_index_items")
    .insert(insertPayload)
    .select("*")
    .single();

  if (dbErr) {
    return error(500, "Failed to create index item", { supabase: dbErr });
  }

  return NextResponse.json({ data }, { status: 201 });
}