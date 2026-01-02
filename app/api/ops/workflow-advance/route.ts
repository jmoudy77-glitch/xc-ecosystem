import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function isUuid(v: unknown): v is string {
  return (
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const run_id = body?.run_id;

  if (!isUuid(run_id)) {
    return NextResponse.json({ error: "invalid_run_id" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("ops_advance_workflow_run", { p_run_id: run_id });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ result: row ?? null }, { status: 200 });
}
