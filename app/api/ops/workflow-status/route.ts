import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function isUuid(v: unknown): v is string {
  return (
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
  );
}

function isStatus(v: unknown): v is "active" | "paused" | "archived" {
  return v === "active" || v === "paused" || v === "archived";
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const workflow_id = body?.workflow_id;
  const status = body?.status;

  if (!isUuid(workflow_id)) {
    return NextResponse.json({ error: "invalid_workflow_id" }, { status: 400 });
  }
  if (!isStatus(status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("ops_set_workflow_status", {
    p_workflow_id: workflow_id,
    p_status: status,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ result: row ?? null }, { status: 200 });
}
