import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function isUuid(v: unknown): v is string {
  return (
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
  );
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const run_id = url.searchParams.get("run_id");

  if (!isUuid(run_id)) {
    return NextResponse.json({ error: "invalid_run_id" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("ops_get_workflow_run_detail", { p_run_id: run_id });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (data?.error === "run_not_found") {
    return NextResponse.json({ error: "run_not_found" }, { status: 404 });
  }

  return NextResponse.json({ detail: data }, { status: 200 });
}
