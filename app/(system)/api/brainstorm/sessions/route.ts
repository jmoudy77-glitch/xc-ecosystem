// app/api/brainstorm/sessions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function jsonError(status: number, message: string, extra?: any) {
  return NextResponse.json({ error: message, ...(extra ? { extra } : {}) }, { status });
}

export async function GET(req: NextRequest) {
  const { supabase } = await supabaseServer(req);

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return jsonError(401, "Unauthorized");

  const { searchParams } = new URL(req.url);
  const program_id = searchParams.get("program_id");
  const team_id = searchParams.get("team_id"); // optional filter
  const scope_type = searchParams.get("scope_type"); // optional filter
  const scope_id = searchParams.get("scope_id"); // optional filter

  if (!program_id) return jsonError(400, "Missing required query param: program_id");

  let q = supabase
    .from("brainstorm_sessions")
    .select("*")
    .eq("program_id", program_id)
    .order("updated_at", { ascending: false });

  if (team_id) q = q.eq("team_id", team_id);
  if (scope_type) q = q.eq("scope_type", scope_type);
  if (scope_id) q = q.eq("scope_id", scope_id);

  const { data, error } = await q;
  if (error) return jsonError(500, "Failed to load brainstorm sessions", { supabase: error });

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const { supabase } = await supabaseServer(req);

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return jsonError(401, "Unauthorized");

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const program_id: string | undefined = body.program_id;
  const title: string | undefined = body.title;
  const scope_type: string | undefined = body.scope_type; // REQUIRED by table
  const scope_id: string | null | undefined = body.scope_id ?? null; // optional
  const team_id: string | null | undefined = body.team_id ?? null; // optional

  if (!program_id) return jsonError(400, "Missing required field: program_id");
  if (!title) return jsonError(400, "Missing required field: title");
  if (!scope_type) {
    // We *could* default scope_type, but that creates drift. Force caller to be explicit.
    return jsonError(400, "Missing required field: scope_type");
  }

  const insertPayload = {
    program_id,
    team_id,
    scope_type,
    scope_id,
    title,
    created_by_user_id: auth.user.id,
    status: "active",
    started_at: new Date().toISOString(),
    summary_index_json: {},
    metadata: {},
  };

  const { data, error } = await supabase
    .from("brainstorm_sessions")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) return jsonError(500, "Failed to create brainstorm session", { supabase: error });

  return NextResponse.json({ data }, { status: 201 });
}