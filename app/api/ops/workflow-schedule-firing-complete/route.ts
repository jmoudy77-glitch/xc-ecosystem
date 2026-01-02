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

  const firing_id = body?.firing_id;
  const run_id = body?.run_id;
  const errorText = body?.error;

  if (!isUuid(firing_id)) {
    return NextResponse.json({ error: "invalid_firing_id" }, { status: 400 });
  }
  if (!isUuid(run_id)) {
    return NextResponse.json({ error: "invalid_run_id" }, { status: 400 });
  }
  if (errorText !== undefined && errorText !== null && typeof errorText !== "string") {
    return NextResponse.json({ error: "invalid_error" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("ops_complete_schedule_firing", {
    p_firing_id: firing_id,
    p_run_id: run_id,
    p_error: typeof errorText === "string" && errorText.trim() ? errorText.trim() : null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (data?.error === "firing_not_found") {
    return NextResponse.json({ error: "firing_not_found" }, { status: 404 });
  }

  return NextResponse.json({ result: data }, { status: 200 });
}
