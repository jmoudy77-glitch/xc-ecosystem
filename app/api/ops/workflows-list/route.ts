import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function isUuid(v: unknown): v is string {
  return (
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
  );
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const program_id = url.searchParams.get("program_id");

  if (!isUuid(program_id)) {
    return NextResponse.json({ error: "invalid_program_id" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("ops_list_operational_workflows", { p_program_id: program_id });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ result: data }, { status: 200 });
}
