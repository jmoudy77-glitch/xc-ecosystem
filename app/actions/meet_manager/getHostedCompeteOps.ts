/* File: app/actions/meet_manager/getHostedCompeteOps.ts */
"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export type HostOpsEvent = {
  eventId: string;
  eventType: "XC" | "TRACK" | "FIELD" | string;
  scheduledAt: string | null;
  state: string | null;
};

export type HostOpsEntry = {
  athleteId: string;
  programId: string | null;
  firstName: string;
  lastName: string;
  entryState: string;
  latestResultSummary: string | null;
  latestPublicationState: string | null;
  latestRevisionNumber: number | null;
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

function deriveEventState(e: any): string | null {
  return e?.xc_state ?? e?.tf_state ?? e?.field_state ?? null;
}

export async function getHostedCompeteOps(meetId: string, selectedEventId: string | null): Promise<{
  events: HostOpsEvent[];
  entries: HostOpsEntry[];
}> {
  const cookieStore = (await cookies()) as any;
  const supabase = supabaseServer(cookieStore);

  // Events
  const { data: eventsData, error: eventsErr } = await supabase
    .from("meet_events")
    .select("id, event_type, scheduled_at, xc_state, tf_state, field_state")
    .eq("meet_id", meetId)
    .order("scheduled_at", { ascending: true, nullsFirst: false });

  if (eventsErr) throw eventsErr;

  const events: HostOpsEvent[] = (eventsData ?? []).map((e: any) => ({
    eventId: String(e.id),
    eventType: String(e.event_type ?? "") as any,
    scheduledAt: e.scheduled_at ? String(e.scheduled_at) : null,
    state: deriveEventState(e),
  }));

  if (!selectedEventId) {
    return { events, entries: [] };
  }

  // Entries for the selected event
  const { data: entryRows, error: entriesErr } = await supabase
    .from("meet_entries")
    .select("athlete_id, program_id, entry_state")
    .eq("meet_id", meetId)
    .eq("event_id", selectedEventId);

  if (entriesErr) throw entriesErr;

  const athleteIds = Array.from(new Set((entryRows ?? []).map((r: any) => String(r.athlete_id))));
  if (athleteIds.length === 0) {
    return { events, entries: [] };
  }

  const { data: athletesData, error: athletesErr } = await supabase
    .from("athletes")
    .select("id, first_name, last_name")
    .in("id", athleteIds);

  if (athletesErr) throw athletesErr;

  const athleteById = new Map<string, { first: string; last: string }>();
  for (const a of athletesData ?? []) {
    athleteById.set(String((a as any).id), {
      first: String((a as any).first_name ?? ""),
      last: String((a as any).last_name ?? ""),
    });
  }

  // Latest results for this event (any publication_state; host can see)
  const { data: resultsData, error: resultsErr } = await supabase
    .from("meet_results")
    .select("athlete_id, revision_number, publication_state, result_payload, created_at")
    .eq("meet_id", meetId)
    .eq("event_id", selectedEventId)
    .in("athlete_id", athleteIds)
    .order("created_at", { ascending: false });

  if (resultsErr) throw resultsErr;

  const latestByAthlete = new Map<
    string,
    { rev: number; pub: string; summary: string | null }
  >();

  for (const r of resultsData ?? []) {
    const aid = String((r as any).athlete_id);
    if (latestByAthlete.has(aid)) continue;

    const payload = (r as any).result_payload;
    const summary =
      payload && typeof payload === "object"
        ? (payload.summary ?? payload.time ?? payload.mark ?? null)
        : null;

    latestByAthlete.set(aid, {
      rev: Number((r as any).revision_number),
      pub: String((r as any).publication_state ?? ""),
      summary: summary ? String(summary) : null,
    });
  }

  const entries: HostOpsEntry[] = (entryRows ?? []).map((r: any) => {
    const aid = String(r.athlete_id);
    const name = athleteById.get(aid) ?? { first: "", last: "" };
    const latest = latestByAthlete.get(aid) ?? null;

    return {
      athleteId: aid,
      programId: r.program_id ? String(r.program_id) : null,
      firstName: name.first,
      lastName: name.last,
      entryState: String(r.entry_state ?? ""),
      latestResultSummary: latest?.summary ?? null,
      latestPublicationState: latest?.pub ?? null,
      latestRevisionNumber: latest?.rev ?? null,
    };
  });

  // Stable sort
  entries.sort((a, b) => (a.lastName || "").localeCompare(b.lastName || "") || (a.firstName || "").localeCompare(b.firstName || ""));

  return { events, entries };
}
