import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const program_id = url.searchParams.get("program_id");
  const status = url.searchParams.get("status");

  const { data, error } = await supabaseAdmin
    .from("operational_workflow_violation_registry")
    .select("*")
    .eq("program_id", program_id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ result: data }, { status: 200 });
}
