import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function isKey(v: unknown): v is string {
  return typeof v === "string" && /^[a-z0-9][a-z0-9:_\-\.]{1,127}$/i.test(v);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const key = body?.key;
  const is_enabled = body?.is_enabled;

  if (!isKey(key)) {
    return NextResponse.json({ error: "invalid_key" }, { status: 400 });
  }
  if (typeof is_enabled !== "boolean") {
    return NextResponse.json({ error: "invalid_is_enabled" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("ops_set_workflow_action_enabled", {
    p_key: key,
    p_enabled: is_enabled,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ result: row ?? null }, { status: 200 });
}
