/* File: app/actions/meet_manager/getAttendingCompeteReadOnly.ts */
"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type RosterAthlete = {
  athleteId: string;
  firstName: string;
  lastName: string;
};

type EventRow = {
  eventId: string;
  eventType: string;
  scheduledAt: string | null;
  state: string | null;
};

type EntryRow = {
  athleteId: string;
  eventId: string;
  entryState: string;
};

type ResultRow = {
  athleteId: string;
  eventId: string;
  revisionNumber: number;
  publicationState: string;
  resultPayload: any;
  createdAt: string;
};

function supabaseServer(cookieStore: any) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).");
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

function deriveEventState(e: any): string | null {
  return e?.xc_state ?? e?.tf_state ?? e?.field_state ?? null;
}

export async function getAttendingCompeteReadOnly(programId: string, meetId: string): Promise<{
  events: EventRow[];
  rosterAthletes: RosterAthlete[];
  entries: EntryRow[];
  results: ResultRow[];
}> {
  const cookieStore = (await cookies()) as any;
  const supabase = supabaseServer(cookieStore);

  // 1) Events (read-only)
  const { data: eventsData, error: eventsErr } = await supabase
    .from("meet_events")
    .select("id, event_type, scheduled_at, xc_state, tf_state, field_state")
    .eq("meet_id", meetId)
    .order("scheduled_at", { ascending: true, nullsFirst: false });

  if (eventsErr) throw eventsErr;

  const events: EventRow[] = (eventsData ?? []).map((e: any) => ({
    eventId: String(e.id),
    eventType: String(e.event_type ?? ""),
    scheduledAt: e.scheduled_at ? String(e.scheduled_at) : null,
    state: deriveEventState(e),
  }));

  // 2) Roster membership for this program at this meet
  const { data: rosterIdsData, error: rosterIdsErr } = await supabase
    .from("meet_roster_athletes")
    .select("athlete_id")
    .eq("meet_id", meetId)
    .eq("program_id", programId);

  if (rosterIdsErr) throw rosterIdsErr;

  const rosterIds = (rosterIdsData ?? []).map((r: any) => String(r.athlete_id));

  // No roster => return events only
  if (rosterIds.length === 0) {
    return { events, rosterAthletes: [], entries: [], results: [] };
  }

  // 3) Fetch athlete names (program scoped)
  const { data: athletesData, error: athletesErr } = await supabase
    .from("athletes")
    .select("id, first_name, last_name")
    .eq("program_id", programId)
    .in("id", rosterIds)
    .order("last_name", { ascending: true });

  if (athletesErr) throw athletesErr;

  const rosterAthletes: RosterAthlete[] = (athletesData ?? []).map((a: any) => ({
    athleteId: String(a.id),
    firstName: String(a.first_name ?? ""),
    lastName: String(a.last_name ?? ""),
  }));

  // 4) Entries for roster athletes (meet_entries does NOT include program_id in v1.2 core schema)
  const { data: entriesData, error: entriesErr } = await supabase
    .from("meet_entries")
    .select("athlete_id, event_id, entry_state")
    .eq("meet_id", meetId)
    .in("athlete_id", rosterIds);

  if (entriesErr) throw entriesErr;

  const entries: EntryRow[] = (entriesData ?? []).map((r: any) => ({
    athleteId: String(r.athlete_id),
    eventId: String(r.event_id),
    entryState: String(r.entry_state ?? ""),
  }));

  // 5) Published results only (never provisional for attending)
  const { data: resultsData, error: resultsErr } = await supabase
    .from("meet_results")
    .select("athlete_id, event_id, revision_number, publication_state, result_payload, created_at")
    .eq("meet_id", meetId)
    .in("athlete_id", rosterIds)
    .in("publication_state", ["published", "final", "revised"])
    .order("created_at", { ascending: false });

  if (resultsErr) throw resultsErr;

  const results: ResultRow[] = (resultsData ?? []).map((r: any) => ({
    athleteId: String(r.athlete_id),
    eventId: String(r.event_id),
    revisionNumber: Number(r.revision_number),
    publicationState: String(r.publication_state ?? ""),
    resultPayload: r.result_payload ?? null,
    createdAt: String(r.created_at ?? ""),
  }));

  return { events, rosterAthletes, entries, results };
}
