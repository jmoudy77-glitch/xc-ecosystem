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

function isIdem(v: unknown): v is string {
  return typeof v === "string" && v.length >= 8 && v.length <= 128;
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
  const idempotency_key = body?.idempotency_key;

  if (!isUuid(run_step_id)) {
    return NextResponse.json({ error: "invalid_run_step_id" }, { status: 400 });
  }
  if (!isKey(action_key)) {
    return NextResponse.json({ error: "invalid_action_key" }, { status: 400 });
  }
  if (input !== undefined && (input === null || typeof input !== "object" || Array.isArray(input))) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  if (idempotency_key !== undefined && idempotency_key !== null && !isIdem(idempotency_key)) {
    return NextResponse.json({ error: "invalid_idempotency_key" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("ops_enqueue_workflow_invocation", {
    p_run_step_id: run_step_id,
    p_action_key: String(action_key).toLowerCase(),
    p_input: input ?? {},
    p_idempotency_key: typeof idempotency_key === "string" ? idempotency_key : null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) {
    return NextResponse.json({ error: "invocation_not_created" }, { status: 400 });
  }

  return NextResponse.json({ id: row.id, status: row.status }, { status: 201 });
}
