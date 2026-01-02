import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(_req: NextRequest) {
  const { data, error } = await supabaseAdmin.rpc("ops_workflow_violation_detect_cron", {});

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ result: data }, { status: 200 });
}
