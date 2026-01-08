// app/api/programs/[programId]/teams/[teamId]/team-season/current/route.ts

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

  const programId = body.programId as string;
  const teamId = body.teamId as string;

  const { data, error } = await supabase
    .from("team_seasons")
    .select("id, roster_lock_date, is_locked, team_id, program_id, teams!inner(sport)")
    .eq("program_id", programId)
    .eq("team_id", teamId)
    .eq("is_current", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ ok: false, error: "No current team season" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    data: {
      teamSeasonId: data.id,
      rosterLockDate: data.roster_lock_date,
      isTeamSeasonLocked: data.is_locked,
      sport: (data as any).teams?.sport ?? null,
    },
  });
}
