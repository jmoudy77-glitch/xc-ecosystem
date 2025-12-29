"use server";

import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabaseServer";
import type {
  AbsenceTruthModel,
  CanonicalEvent,
  CanonicalEventLink,
  ProgramHealthAbsence,
} from "@/app/ui/program-health/types";

/**
 * readAbsenceTruth
 * Canonical read for a single Program Health absence:
 * - program_health_absences (program-bound)
 * - canonical_events for absence.canonical_event_id
 * - canonical_event_links touching that canonical event
 * - depth-1 linked canonical_events (program-bound OR program_id IS NULL if RLS permits)
 *
 * No computation. No recommendations. UI truth reveal only.
 */
export async function readAbsenceTruth(
  programId: string,
  absenceId: string
): Promise<AbsenceTruthModel> {
  const cookieStore = await cookies();
  const { supabase } = await supabaseServer(cookieStore);

  // 1) Load absence (program-bound)
  const { data: absence, error: absenceErr } = await supabase
    .from("program_health_absences")
    .select("*")
    .eq("program_id", programId)
    .eq("id", absenceId)
    .maybeSingle();

  if (absenceErr) throw absenceErr;
  if (!absence) throw new Error("Absence not found for program.");

  const canonicalEventId = (absence as ProgramHealthAbsence).canonical_event_id;

  // 2) Load canonical event (program-bound OR system/null program event)
  const { data: canonicalEvent, error: ceErr } = await supabase
    .from("canonical_events")
    .select("*")
    .eq("id", canonicalEventId)
    .or(`program_id.eq.${programId},program_id.is.null`)
    .maybeSingle();

  if (ceErr) throw ceErr;
  if (!canonicalEvent) throw new Error("Canonical event not found or not accessible.");

  // 3) Load causal links touching this canonical event
  const { data: links, error: linksErr } = await supabase
    .from("canonical_event_links")
    .select("*")
    .or(
      `from_canonical_event_id.eq.${canonicalEventId},to_canonical_event_id.eq.${canonicalEventId}`
    )
    .order("created_at", { ascending: true });

  if (linksErr) throw linksErr;

  const linkRows = (links ?? []) as CanonicalEventLink[];

  // 4) Load linked canonical events (depth-1)
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
    absence: absence as ProgramHealthAbsence,
    canonicalEvent: canonicalEvent as CanonicalEvent,
    links: linkRows,
    linkedEvents: (linkedEvents ?? []) as CanonicalEvent[],
  };
}
