import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function isUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function parseDays(v: string | null) {
  const n = Number(v ?? "");
  if (!Number.isFinite(n) || n <= 0) return 30;
  return Math.min(Math.floor(n), 365);
}

function parseKind(v: string | null) {
  const k = (v ?? "health").toLowerCase();
  if (["health", "runs", "actions", "schedules", "steps", "violations"].includes(k)) return k;
  return "health";
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const program_id = url.searchParams.get("program_id");
  const kind = parseKind(url.searchParams.get("kind"));
  const days = parseDays(url.searchParams.get("days"));

  if (!isUuid(program_id)) {
    return NextResponse.json({ error: "invalid_program_id" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("ops_workflow_public_read_gateway", {
    p_program_id: program_id,
    p_kind: kind,
    p_days: days,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ result: data }, { status: 200 });
}
