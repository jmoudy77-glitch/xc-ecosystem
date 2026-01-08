// app/api/roster-planning/state/set-lock/route.ts

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

  const { teamSeasonId, isLocked, syncWithRecruiting } = body as {
    teamSeasonId: string;
    isLocked: boolean;
    syncWithRecruiting: boolean;
  };

  const { data, error } = await supabase.rpc("rpc_roster_planning_set_lock_state_v1", {
    p_team_season_id: teamSeasonId,
    p_is_locked: isLocked,
    p_sync_with_recruiting: syncWithRecruiting,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, data });
}
