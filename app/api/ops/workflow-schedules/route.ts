import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

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
  const { supabase } = await supabaseServer(req);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  const program_id = body?.program_id;
  const workflow_id = body?.workflow_id;
  const name = body?.name;
  const cron = body?.cron;
  const timezone = body?.timezone;
  const is_enabled = body?.is_enabled;
  const spec = body?.spec;

  if (!isUuid(program_id)) {
    return NextResponse.json({ error: "invalid_program_id" }, { status: 400 });
  }
  if (!isUuid(workflow_id)) {
    return NextResponse.json({ error: "invalid_workflow_id" }, { status: 400 });
  }
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  }
  if (!isCron(cron)) {
    return NextResponse.json({ error: "invalid_cron" }, { status: 400 });
  }
  if (timezone !== undefined && timezone !== null && !isTz(timezone)) {
    return NextResponse.json({ error: "invalid_timezone" }, { status: 400 });
  }
  if (is_enabled !== undefined && typeof is_enabled !== "boolean") {
    return NextResponse.json({ error: "invalid_is_enabled" }, { status: 400 });
  }
  if (spec !== undefined && (spec === null || typeof spec !== "object" || Array.isArray(spec))) {
    return NextResponse.json({ error: "invalid_spec" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("operational_workflow_schedules")
    .insert({
      program_id,
      workflow_id,
      name: name.trim(),
      cron: String(cron).trim(),
      timezone: typeof timezone === "string" ? timezone.trim() : "UTC",
      is_enabled: typeof is_enabled === "boolean" ? is_enabled : true,
      spec: spec ?? {},
    })
    .select("id,is_enabled")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ id: data.id, is_enabled: data.is_enabled }, { status: 201 });
}
