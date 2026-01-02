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

  const program_id = body?.program_id;
  const name = body?.name;
  const spec = body?.spec;

  if (!isUuid(program_id)) {
    return NextResponse.json({ error: "invalid_program_id" }, { status: 400 });
  }
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  }
  if (spec !== undefined && (spec === null || typeof spec !== "object" || Array.isArray(spec))) {
    return NextResponse.json({ error: "invalid_spec" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("operational_workflows")
    .insert({
      program_id,
      name: name.trim(),
      spec: spec ?? {},
      status: "active",
    })
    .select("id,status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ id: data.id, status: data.status }, { status: 201 });
}
