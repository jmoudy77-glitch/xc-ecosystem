/* File: app/actions/meet_manager/getMeetEventsForEntries.ts */
"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export type MeetEventOption = {
  eventId: string;
  eventType: string;
  scheduledAt: string | null;
  state: string | null;
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

function deriveState(row: any): string | null {
  return row?.xc_state ?? row?.tf_state ?? row?.field_state ?? null;
}

export async function getMeetEventsForEntries(meetId: string): Promise<MeetEventOption[]> {
  const cookieStore = (await cookies()) as any;
  const supabase = supabaseServer(cookieStore);

  const { data, error } = await supabase
    .from("meet_events")
    .select("id, event_type, scheduled_at, xc_state, tf_state, field_state")
    .eq("meet_id", meetId)
    .order("scheduled_at", { ascending: true, nullsFirst: false });

  if (error) throw error;

  return (data ?? []).map((e: any) => ({
    eventId: String(e.id),
    eventType: String(e.event_type ?? ""),
    scheduledAt: e.scheduled_at ? String(e.scheduled_at) : null,
    state: deriveState(e),
  }));
}
