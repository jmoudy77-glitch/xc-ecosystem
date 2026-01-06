/* File: app/actions/meet_manager/getMeetEntriesForAttendingBuild.ts */
"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export type MeetEntryRow = {
  athleteId: string;
  eventId: string;
  entryState: string;
};

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

export async function getMeetEntriesForAttendingBuild(programId: string, meetId: string): Promise<MeetEntryRow[]> {
  const cookieStore = (await cookies()) as any;
  const supabase = supabaseServer(cookieStore);

  const { data, error } = await supabase
    .from("meet_entries")
    .select("athlete_id, event_id, entry_state")
    .eq("program_id", programId)
    .eq("meet_id", meetId);

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    athleteId: String(r.athlete_id),
    eventId: String(r.event_id),
    entryState: String(r.entry_state ?? ""),
  }));
}
