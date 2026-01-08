// app/api/recruiting/slots/move/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type Body = {
  programId: string;
  teamSeasonId: string;
  sport: string;
  eventGroupKey: string;
  slotId: string;
  athleteId: string;
  athleteType: string;
  originKey: "favorites" | "surfaced";
  displayName: string;
  gradYear?: number | null;
};

export async function POST(req: Request) {
  const body = (await req.json()) as Body;

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

  const { error } = await supabase.rpc("rpc_recruiting_slot_move_durable_v2", {
    p_program_id: body.programId,
    p_team_season_id: body.teamSeasonId,
    p_sport: body.sport,
    p_event_group_key: body.eventGroupKey,
    p_slot_id: body.slotId,
    p_athlete_id: body.athleteId,
    p_athlete_type: body.athleteType,
    p_origin_key: body.originKey,
    p_display_name: body.displayName,
    p_grad_year: body.gradYear ?? null,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
