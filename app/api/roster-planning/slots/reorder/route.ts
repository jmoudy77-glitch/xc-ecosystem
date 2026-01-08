// app/api/roster-planning/slots/reorder/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: Request) {
  const body = await req.json();
  const cookieStore = (await cookies()) as any;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );

  const { teamSeasonId, eventGroupKey, slotId, athleteId, beforeAthleteId } = body as {
    teamSeasonId: string;
    eventGroupKey: string;
    slotId: string;
    athleteId: string;
    beforeAthleteId: string | null;
  };

  const { data, error } = await supabase.rpc("rpc_roster_planning_reorder_within_slot_v1", {
    p_team_season_id: teamSeasonId,
    p_event_group_key: eventGroupKey,
    p_slot_id: slotId,
    p_athlete_id: athleteId,
    p_before_athlete_id: beforeAthleteId,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, data });
}
