import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function isUuid(v: unknown): v is string {
  return (
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
  );
}

function isCron(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const s = v.trim();
  if (s.length < 5 || s.length > 200) return false;
  return s.split(/\s+/).length >= 5;
}

function isTz(v: unknown): v is string {
  return typeof v === "string" && v.trim().length >= 2 && v.trim().length <= 64;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const schedule_id = body?.schedule_id;
  const name = body?.name;
  const cron = body?.cron;
  const timezone = body?.timezone;
  const is_enabled = body?.is_enabled;
  const spec = body?.spec;

  if (!isUuid(schedule_id)) {
    return NextResponse.json({ error: "invalid_schedule_id" }, { status: 400 });
  }
  if (name !== undefined && (typeof name !== "string" || !name.trim())) {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  }
  if (cron !== undefined && !isCron(cron)) {
    return NextResponse.json({ error: "invalid_cron" }, { status: 400 });
  }
  if (timezone !== undefined && !isTz(timezone)) {
    return NextResponse.json({ error: "invalid_timezone" }, { status: 400 });
  }
  if (is_enabled !== undefined && typeof is_enabled !== "boolean") {
    return NextResponse.json({ error: "invalid_is_enabled" }, { status: 400 });
  }
  if (spec !== undefined && (spec === null || typeof spec !== "object" || Array.isArray(spec))) {
    return NextResponse.json({ error: "invalid_spec" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("ops_update_workflow_schedule", {
    p_schedule_id: schedule_id,
    p_name: typeof name === "string" ? name.trim() : null,
    p_cron: typeof cron === "string" ? cron.trim() : null,
    p_timezone: typeof timezone === "string" ? timezone.trim() : null,
    p_is_enabled: typeof is_enabled === "boolean" ? is_enabled : null,
    p_spec: spec ?? null,
  });

  if (error) {
    const status = error.message.includes("schedule_not_found") ? 404 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ result: data ?? null }, { status: 200 });
}
