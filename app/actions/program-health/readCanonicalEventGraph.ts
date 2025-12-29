"use server";

import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabaseServer";
import type { CanonicalEvent, CanonicalEventLink, CanonicalEventGraphModel } from "@/app/ui/program-health/types";

/**
 * readCanonicalEventGraph (depth-1)
 * Canonical read for causality drilldown:
 * - canonical_events for root eventId
 * - canonical_event_links touching root
 * - linked canonical_events for endpoints (depth-1)
 *
 * No computation. No interpretation. Pure truth reveal.
 */
export async function readCanonicalEventGraph(
  programId: string,
  eventId: string
): Promise<CanonicalEventGraphModel> {
  const cookieStore = await cookies();
  const { supabase } = await supabaseServer(cookieStore);

  const { data: rootEvent, error: rootErr } = await supabase
    .from("canonical_events")
    .select("*")
    .eq("id", eventId)
    .or(`program_id.eq.${programId},program_id.is.null`)
    .maybeSingle();

  if (rootErr) throw rootErr;
  if (!rootEvent) throw new Error("Canonical event not found or not accessible.");

  const { data: links, error: linksErr } = await supabase
    .from("canonical_event_links")
    .select("*")
    .or(`from_canonical_event_id.eq.${eventId},to_canonical_event_id.eq.${eventId}`)
    .order("created_at", { ascending: true });

  if (linksErr) throw linksErr;

  const linkRows = (links ?? []) as CanonicalEventLink[];

  const linkedIds = Array.from(
    new Set(linkRows.flatMap((l) => [l.from_canonical_event_id, l.to_canonical_event_id]))
  ).filter(Boolean) as string[];

  const { data: linkedEvents, error: linkedErr } = await supabase
    .from("canonical_events")
    .select("*")
    .in("id", linkedIds)
    .or(`program_id.eq.${programId},program_id.is.null`)
    .order("created_at", { ascending: true });

  if (linkedErr) throw linkedErr;

  return {
    rootEvent: rootEvent as CanonicalEvent,
    links: linkRows,
    linkedEvents: (linkedEvents ?? []) as CanonicalEvent[],
  };
}
