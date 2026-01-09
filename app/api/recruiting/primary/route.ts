import { NextResponse } from "next/server";
import { supabaseRouteClient } from "@/lib/supabase/route";
import { slotSetPrimary } from "@/lib/modules/recruiting/services/slotSetPrimary";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = await supabaseRouteClient();

    await slotSetPrimary(supabase, {
      programId: body.programId,
      teamSeasonId: body.teamSeasonId,
      sport: body.sport ?? "xc",
      eventGroupKey: body.eventGroupKey,
      slotId: body.slotId,
      primaryAthleteId: body.primaryAthleteId ?? null,
      athleteType: body.athleteType,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 400 });
  }
}
