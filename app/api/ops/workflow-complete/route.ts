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
  const success = body?.success;
  const output = body?.output;
  const errorText = body?.error;

  if (!isUuid(invocation_id)) {
    return NextResponse.json({ error: "invalid_invocation_id" }, { status: 400 });
  }
  if (typeof success !== "boolean") {
    return NextResponse.json({ error: "invalid_success" }, { status: 400 });
  }
  if (output !== undefined && (output === null || typeof output !== "object" || Array.isArray(output))) {
    return NextResponse.json({ error: "invalid_output" }, { status: 400 });
  }
  if (errorText !== undefined && errorText !== null && typeof errorText !== "string") {
    return NextResponse.json({ error: "invalid_error" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("ops_complete_workflow_invocation", {
    p_invocation_id: invocation_id,
    p_success: success,
    p_output: output ?? {},
    p_error: success ? null : typeof errorText === "string" ? errorText : "failed",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ invocation: data }, { status: 200 });
}
