import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
  const body = await req.json().catch(() => null);

  const workflow_id = body?.workflow_id;
  const program_id = body?.program_id;
  const run_idempotency_key = body?.run_idempotency_key;
  const enqueue_idempotency_key = body?.enqueue_idempotency_key;

  if (!isUuid(workflow_id)) {
    return NextResponse.json({ error: "invalid_workflow_id" }, { status: 400 });
  }
  if (!isUuid(program_id)) {
    return NextResponse.json({ error: "invalid_program_id" }, { status: 400 });
  }
  if (run_idempotency_key !== undefined && run_idempotency_key !== null && !isIdem(run_idempotency_key)) {
    return NextResponse.json({ error: "invalid_run_idempotency_key" }, { status: 400 });
  }
  if (enqueue_idempotency_key !== undefined && enqueue_idempotency_key !== null && !isIdem(enqueue_idempotency_key)) {
    return NextResponse.json({ error: "invalid_enqueue_idempotency_key" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("ops_start_workflow_run", {
    p_workflow_id: workflow_id,
    p_program_id: program_id,
    p_run_idempotency_key: typeof run_idempotency_key === "string" ? run_idempotency_key : null,
    p_enqueue_idempotency_key: typeof enqueue_idempotency_key === "string" ? enqueue_idempotency_key : null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ result: row ?? null }, { status: 200 });
}
