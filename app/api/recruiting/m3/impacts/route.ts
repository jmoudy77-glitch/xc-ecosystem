import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/app/lib/supabase/service";
import { readRecruitingM3Impacts } from "@/app/lib/m3/runtime";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const programId = url.searchParams.get("programId");
  const teamId = url.searchParams.get("teamId");
  const horizon = url.searchParams.get("horizon");

  try {
    const supabase = getSupabaseServiceClient();
    const result = await readRecruitingM3Impacts(supabase, { programId, teamId, horizon });
    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 400 });
  }
}
