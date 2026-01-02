import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function isUuid(v: unknown): v is string {
  return (
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
  );
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
  const workflow_id = body?.workflow_id;
  const program_id = body?.program_id;
  const idempotency_key = body?.idempotency_key;

  if (!isUuid(workflow_id)) {
    return NextResponse.json({ error: "invalid_workflow_id" }, { status: 400 });
  }
  if (!isUuid(program_id)) {
    return NextResponse.json({ error: "invalid_program_id" }, { status: 400 });
  }
  if (idempotency_key !== undefined && idempotency_key !== null && !isIdem(idempotency_key)) {
    return NextResponse.json({ error: "invalid_idempotency_key" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("ops_create_workflow_run", {
    p_workflow_id: workflow_id,
    p_program_id: program_id,
    p_idempotency_key: typeof idempotency_key === "string" ? idempotency_key : null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) {
    return NextResponse.json({ error: "run_not_created" }, { status: 400 });
  }

  return NextResponse.json({ id: row.id, status: row.status }, { status: 201 });
}
