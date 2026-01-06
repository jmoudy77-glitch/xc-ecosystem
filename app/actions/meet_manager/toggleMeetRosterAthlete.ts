/* File: app/actions/meet_manager/toggleMeetRosterAthlete.ts */
"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function supabaseServer(cookieStore: any) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase env vars.");
  }

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
  meetId: string,
  athleteId: string,
  include: boolean
) {
  const cookieStore = (await cookies()) as any;
  const supabase = supabaseServer(cookieStore);

  if (include) {
    const { error } = await supabase.from("meet_rosters").insert({
      meet_id: meetId,
      athlete_id: athleteId,
    });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("meet_rosters")
      .delete()
      .eq("meet_id", meetId)
      .eq("athlete_id", athleteId);
    if (error) throw error;
  }
}
