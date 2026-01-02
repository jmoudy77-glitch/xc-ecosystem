import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function isUuid(v: unknown): v is string {
  return (
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
  );
}

function parseStatus(v: unknown) {
  const s = typeof v === "string" ? v : "";
  if (s === "dismissed") return "dismissed";
  return "resolved";
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const program_id = body.program_id;
  const violation_id = body.violation_id;
  const status = parseStatus(body.status);

  if (!isUuid(program_id) || !isUuid(violation_id)) {
    return NextResponse.json({ error: "invalid_ids" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("ops_workflow_violation_resolve", {
    p_program_id: program_id,
    p_violation_id: violation_id,
    p_status: status,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ result: data }, { status: 200 });
}
