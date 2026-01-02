import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function isUuid(v: unknown): v is string {
  return (
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
  );
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
  const workflow_id = body?.workflow_id;
  const step_order = body?.step_order;
  const action = body?.action;
  const config = body?.config;

  if (!isUuid(workflow_id)) {
    return NextResponse.json({ error: "invalid_workflow_id" }, { status: 400 });
  }
  if (typeof step_order !== "number" || !Number.isInteger(step_order) || step_order < 0) {
    return NextResponse.json({ error: "invalid_step_order" }, { status: 400 });
  }
  if (typeof action !== "string" || !action.trim()) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }
  if (config !== undefined && (config === null || typeof config !== "object" || Array.isArray(config))) {
    return NextResponse.json({ error: "invalid_config" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("operational_workflow_steps")
    .insert({
      workflow_id,
      step_order,
      action: action.trim(),
      config: config ?? {},
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
