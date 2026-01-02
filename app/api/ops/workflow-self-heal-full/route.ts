import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function isUuid(v: unknown): v is string {
  return (
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
  );
}

function parseStaleMinutes(v: unknown) {
  const n = Number(v ?? "");
  if (!Number.isFinite(n) || n <= 0) return 15;
  return Math.min(Math.floor(n), 1440);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const program_id = body.program_id;
  const stale_minutes = parseStaleMinutes(body.stale_minutes);

  if (!isUuid(program_id)) {
    return NextResponse.json({ error: "invalid_program_id" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("ops_workflow_self_heal_full", {
    p_program_id: program_id,
    p_stale_minutes: stale_minutes,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ result: data }, { status: 200 });
}
