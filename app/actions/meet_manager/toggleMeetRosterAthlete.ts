/* File: app/actions/meet_manager/toggleMeetRosterAthlete.ts */
"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function supabaseServer(cookieStore: any) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) throw new Error("Missing Supabase env vars.");

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set() {},
      remove() {},
    },
  });
}

export async function toggleMeetRosterAthlete(
  programId: string,
  meetId: string,
  athleteId: string,
  include: boolean
) {
  const cookieStore = (await cookies()) as any;
  const supabase = supabaseServer(cookieStore);

  if (include) {
    // meet_rosters is a header table (meet_id, program_id unique). Ensure it exists.
    // Do not set roster_state here (avoid guessing enum values); rely on table default.
    const { error: upsertErr } = await supabase.from("meet_rosters").upsert(
      {
        meet_id: meetId,
        program_id: programId,
      },
      { onConflict: "meet_id,program_id" }
    );
    if (upsertErr) throw upsertErr;

    const { error } = await supabase.from("meet_roster_athletes").insert({
      meet_id: meetId,
      program_id: programId,
      athlete_id: athleteId,
      attendance_state: "attending",
    });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("meet_roster_athletes")
      .delete()
      .eq("meet_id", meetId)
      .eq("program_id", programId)
      .eq("athlete_id", athleteId);

    if (error) throw error;
  }
}
