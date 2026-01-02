import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function parseLimit(v: string | null) {
  const n = Number(v ?? "");
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(Math.floor(n), 25);
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const limit = parseLimit(url.searchParams.get("limit"));

  const { data, error } = await supabaseAdmin.rpc("ops_dispatch_next_workflow_invocation", { p_limit: limit });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ invocations: data ?? [] }, { status: 200 });
}
