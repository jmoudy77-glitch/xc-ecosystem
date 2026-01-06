/* File: app/actions/meet_manager/getMeetRosterAthleteIds.ts */
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

export async function getMeetRosterAthleteIds(programId: string, meetId: string): Promise<string[]> {
  const cookieStore = (await cookies()) as any;
  const supabase = supabaseServer(cookieStore);

  const { data, error } = await supabase
    .from("meet_roster_athletes")
    .select("athlete_id")
    .eq("program_id", programId)
    .eq("meet_id", meetId);

  if (error) throw error;

  const ids = (data ?? []).map((r: any) => r.athlete_id).filter(Boolean);

  // Hard de-dupe for stability (DB may already contain duplicates).
  return Array.from(new Set(ids));
}
