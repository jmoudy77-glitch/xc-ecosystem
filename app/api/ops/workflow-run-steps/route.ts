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

  const run_id = body?.run_id;
  const workflow_step_id = body?.workflow_step_id;
  const step_order = body?.step_order;

  if (!isUuid(run_id)) {
    return NextResponse.json({ error: "invalid_run_id" }, { status: 400 });
  }
  if (!isUuid(workflow_step_id)) {
    return NextResponse.json({ error: "invalid_workflow_step_id" }, { status: 400 });
  }
  if (typeof step_order !== "number" || !Number.isInteger(step_order) || step_order < 0) {
    return NextResponse.json({ error: "invalid_step_order" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("operational_workflow_run_steps")
    .insert({
      run_id,
      workflow_step_id,
      step_order,
      status: "pending",
      output: {},
    })
    .select("id,status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ id: data.id, status: data.status }, { status: 201 });
}
