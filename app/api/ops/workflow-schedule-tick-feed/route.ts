import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function parseLimit(v: string | null) {
  const n = Number(v ?? "");
  if (!Number.isFinite(n) || n <= 0) return 100;
  return Math.min(Math.floor(n), 500);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = parseLimit(url.searchParams.get("limit"));

  const { data, error } = await supabaseAdmin.rpc("ops_schedule_tick_feed", { p_limit: limit });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ result: data }, { status: 200 });
}
