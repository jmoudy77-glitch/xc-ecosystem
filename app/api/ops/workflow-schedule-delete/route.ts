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
  const schedule_id = body?.schedule_id;

  if (!isUuid(schedule_id)) {
    return NextResponse.json({ error: "invalid_schedule_id" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("ops_delete_workflow_schedule", { p_schedule_id: schedule_id });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (data?.error === "schedule_not_found") {
    return NextResponse.json({ error: "schedule_not_found" }, { status: 404 });
  }

  return NextResponse.json({ result: data }, { status: 200 });
}
