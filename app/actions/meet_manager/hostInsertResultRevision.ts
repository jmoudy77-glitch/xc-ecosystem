/* File: app/actions/meet_manager/hostInsertResultRevision.ts */
"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type PublicationState = "provisional" | "published" | "final" | "revised";

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

async function nextRevisionNumber(supabase: any, eventId: string, athleteId: string): Promise<number> {
  const { data, error } = await supabase
    .from("meet_results")
    .select("revision_number")
    .eq("event_id", eventId)
    .eq("athlete_id", athleteId)
    .order("revision_number", { ascending: false })
    .limit(1);

  if (error) throw error;

  const current = (data ?? [])[0]?.revision_number;
  return current ? Number(current) + 1 : 1;
}

export async function hostInsertResultRevision(args: {
  meetId: string;
  eventId: string;
  athleteId: string;
  publicationState: PublicationState;
  summary: string;
}) {
  const cookieStore = (await cookies()) as any;
  const supabase = supabaseServer(cookieStore);

  const rev = await nextRevisionNumber(supabase, args.eventId, args.athleteId);

  const payload = {
    summary: args.summary,
  };

  const { error } = await supabase.from("meet_results").insert({
    meet_id: args.meetId,
    event_id: args.eventId,
    athlete_id: args.athleteId,
    revision_number: rev,
    publication_state: args.publicationState,
    result_payload: payload,
  });

  if (error) throw error;
}
