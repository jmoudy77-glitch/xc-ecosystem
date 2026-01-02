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
  const invocation_id = body?.invocation_id;

  if (!isUuid(invocation_id)) {
    return NextResponse.json({ error: "invalid_invocation_id" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.rpc("ops_apply_invocation_result_to_run_step", {
    p_invocation_id: invocation_id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
