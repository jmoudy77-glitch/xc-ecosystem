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

  const run_step_id = body?.run_step_id;
  const from_status = body?.from_status;
  const to_status = body?.to_status;
  const message = body?.message;
  const meta = body?.meta;

  if (!isUuid(run_step_id)) {
    return NextResponse.json({ error: "invalid_run_step_id" }, { status: 400 });
  }
  if (from_status !== undefined && from_status !== null && typeof from_status !== "string") {
    return NextResponse.json({ error: "invalid_from_status" }, { status: 400 });
  }
  if (typeof to_status !== "string" || !to_status.trim()) {
    return NextResponse.json({ error: "invalid_to_status" }, { status: 400 });
  }
  if (message !== undefined && message !== null && typeof message !== "string") {
    return NextResponse.json({ error: "invalid_message" }, { status: 400 });
  }
  if (meta !== undefined && (meta === null || typeof meta !== "object" || Array.isArray(meta))) {
    return NextResponse.json({ error: "invalid_meta" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("operational_workflow_run_step_transitions")
    .insert({
      run_step_id,
      from_status: typeof from_status === "string" ? from_status : null,
      to_status: to_status.trim(),
      message: typeof message === "string" ? message : null,
      meta: meta ?? {},
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
