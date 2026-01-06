/* File: app/actions/meet_manager/getMeetReviewReadOnly.ts */
"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export type ReviewEvent = {
  eventId: string;
  eventType: string;
  scheduledAt: string | null;
  state: string | null;
};

export type ReviewAthlete = {
  athleteId: string;
  firstName: string;
  lastName: string;
};

export type ReviewEntry = {
  athleteId: string;
  eventId: string;
  entryState: string;
};

export type ReviewResult = {
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

export async function getMeetReviewReadOnly(args: {
  programId: string;
  meetId: string;
  includeProvisional: boolean;
}): Promise<{
  events: ReviewEvent[];
  rosterAthletes: ReviewAthlete[];
  entries: ReviewEntry[];
  results: ReviewResult[];
}> {
  const cookieStore = (await cookies()) as any;
  const supabase = supabaseServer(cookieStore);

  // Events
  const { data: eventsData, error: eventsErr } = await supabase
    .from("meet_events")
    .select("id, event_type, scheduled_at, xc_state, tf_state, field_state")
    .eq("meet_id", args.meetId)
    .order("scheduled_at", { ascending: true, nullsFirst: false });

  if (eventsErr) throw eventsErr;

  const events: ReviewEvent[] = (eventsData ?? []).map((e: any) => ({
    eventId: String(e.id),
    eventType: String(e.event_type ?? ""),
    scheduledAt: e.scheduled_at ? String(e.scheduled_at) : null,
    state: deriveEventState(e),
  }));

  // Roster membership for this program at this meet
  const { data: rosterIdsData, error: rosterIdsErr } = await supabase
    .from("meet_roster_athletes")
    .select("athlete_id")
    .eq("meet_id", args.meetId)
    .eq("program_id", args.programId);

  if (rosterIdsErr) throw rosterIdsErr;

  const rosterIds = (rosterIdsData ?? []).map((r: any) => String(r.athlete_id));

  if (rosterIds.length === 0) {
    return { events, rosterAthletes: [], entries: [], results: [] };
  }

  // Athlete names (program scoped)
  const { data: athletesData, error: athletesErr } = await supabase
    .from("athletes")
    .select("id, first_name, last_name")
    .eq("program_id", args.programId)
    .in("id", rosterIds)
    .order("last_name", { ascending: true });

  if (athletesErr) throw athletesErr;

  const rosterAthletes: ReviewAthlete[] = (athletesData ?? []).map((a: any) => ({
    athleteId: String(a.id),
    firstName: String(a.first_name ?? ""),
    lastName: String(a.last_name ?? ""),
  }));

  // Entries for roster athletes
  const { data: entriesData, error: entriesErr } = await supabase
    .from("meet_entries")
    .select("athlete_id, event_id, entry_state")
    .eq("meet_id", args.meetId)
    .in("athlete_id", rosterIds);

  if (entriesErr) throw entriesErr;

  const entries: ReviewEntry[] = (entriesData ?? []).map((r: any) => ({
    athleteId: String(r.athlete_id),
    eventId: String(r.event_id),
    entryState: String(r.entry_state ?? ""),
  }));

  // Results visibility
  const visibleStates = args.includeProvisional
    ? ["provisional", "published", "final", "revised"]
    : ["published", "final", "revised"];

  const { data: resultsData, error: resultsErr } = await supabase
    .from("meet_results")
    .select("athlete_id, event_id, revision_number, publication_state, result_payload, created_at")
    .eq("meet_id", args.meetId)
    .in("athlete_id", rosterIds)
    .in("publication_state", visibleStates)
    .order("created_at", { ascending: false });

  if (resultsErr) throw resultsErr;

  const results: ReviewResult[] = (resultsData ?? []).map((r: any) => ({
    athleteId: String(r.athlete_id),
    eventId: String(r.event_id),
    revisionNumber: Number(r.revision_number),
    publicationState: String(r.publication_state ?? ""),
    resultPayload: r.result_payload ?? null,
    createdAt: String(r.created_at ?? ""),
  }));

  return { events, rosterAthletes, entries, results };
}
