import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function isUuid(v: unknown): v is string {
  return (
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
  );
}

function isKey(v: unknown): v is string {
  return typeof v === "string" && /^[a-z0-9][a-z0-9:_\-\.]{1,127}$/i.test(v);
}

export async function POST(req: NextRequest) {
  const { supabase } = await supabaseServer(req);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  const run_step_id = body?.run_step_id;
  const action_key = body?.action_key;
  const input = body?.input;

  if (!isUuid(run_step_id)) {
    return NextResponse.json({ error: "invalid_run_step_id" }, { status: 400 });
  }
  if (!isKey(action_key)) {
    return NextResponse.json({ error: "invalid_action_key" }, { status: 400 });
  }
  if (input !== undefined && (input === null || typeof input !== "object" || Array.isArray(input))) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("operational_workflow_invocations")
    .insert({
      run_step_id,
      action_key: String(action_key).toLowerCase(),
      status: "queued",
      input: input ?? {},
      output: {},
    })
    .select("id,status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ id: data.id, status: data.status }, { status: 201 });
}
