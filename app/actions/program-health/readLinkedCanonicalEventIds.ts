"use server";

import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabaseServer";
import type { LinkedCanonicalEventIdsModel } from "@/app/ui/program-health/types";

/**
 * readLinkedCanonicalEventIds (depth-1)
 * Returns canonical event IDs adjacent to the root event via canonical_event_links.
 * No interpretation; pure canonical adjacency.
 */
export async function readLinkedCanonicalEventIds(
  programId: string,
  canonicalEventId: string
): Promise<LinkedCanonicalEventIdsModel> {
  const cookieStore = await cookies();
  const { supabase } = await supabaseServer(cookieStore);

  const { data: links, error: linksErr } = await supabase
    .from("canonical_event_links")
    .select("from_canonical_event_id,to_canonical_event_id")
    .or(`from_canonical_event_id.eq.${canonicalEventId},to_canonical_event_id.eq.${canonicalEventId}`);

  if (linksErr) throw linksErr;

  const ids = new Set<string>();
  ids.add(canonicalEventId);

  for (const l of links ?? []) {
    const fromId = (l as any).from_canonical_event_id as string | null;
    const toId = (l as any).to_canonical_event_id as string | null;
    if (fromId) ids.add(fromId);
    if (toId) ids.add(toId);
  }

  return {
    rootEventId: canonicalEventId,
    linkedEventIds: Array.from(ids),
  };
}
