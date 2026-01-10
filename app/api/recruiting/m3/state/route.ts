import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/app/lib/supabase/service";
import { readM3RuntimeState } from "@/app/lib/m3/runtime";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const programId = url.searchParams.get("programId");
  const teamId = url.searchParams.get("teamId");

  try {
    const supabase = getSupabaseServiceClient();
    const state = await readM3RuntimeState(supabase, { programId, teamId });
    return NextResponse.json(state, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 400 });
  }
}
