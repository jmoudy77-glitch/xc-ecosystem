"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@supabase/ssr";

type SeedResult =
  | { ok: true; inserted: number; sport: string; eventCodes: string[] }
  | { ok: false; error: string };

function supabaseServer() {
  const cookieStore = cookies() as any;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        cookieStore.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });
}

function meetTypeToSport(meetType: string): "xc" | "track" | "field" | null {
  const t = (meetType || "").toUpperCase();
  if (t === "XC" || t.startsWith("XC_")) return "xc";
  if (t === "TRACK") return "track";
  if (t === "FIELD") return "field";
  return null;
}

/**
 * Seed meet_events from event_definitions for a hosted meet.
 *
 * Contract:
 * - For XC (event_code like XC_5K), insert meet_events.event_type = event_code
 * - Satisfy meet_events_state_onehot_chk by setting xc_state to 'not_started'
 *   and leaving tf_state/field_state NULL.
 */
export async function seedMeetEventsForHostedBuild(args: {
  meetId: string;
  buildPathToRevalidate: string;
}): Promise<SeedResult> {
  const { meetId, buildPathToRevalidate } = args;

  try {
    const supabase = supabaseServer();

    const { data: meetRow, error: meetErr } = await supabase
      .from("meets")
      .select("id, meet_type")
      .eq("id", meetId)
      .maybeSingle();

    if (meetErr) return { ok: false, error: meetErr.message };
    if (!meetRow) return { ok: false, error: `Meet not found: ${meetId}` };

    const sport = meetTypeToSport(String(meetRow.meet_type));
    if (!sport) return { ok: false, error: `Unsupported meet_type: ${meetRow.meet_type}` };

    // For now, seed only XC since states/enums for TRACK/FIELD are not yet locked here.
    if (sport !== "xc") {
      return { ok: false, error: `Seeding not implemented for sport='${sport}' yet` };
    }

    const { data: defs, error: defsErr } = await supabase
      .from("event_definitions")
      .select("event_code, sport, display_name")
      .eq("sport", sport)
      .order("event_code", { ascending: true });

    if (defsErr) return { ok: false, error: defsErr.message };
    if (!defs || defs.length === 0) return { ok: false, error: `No event_definitions found for sport='${sport}'` };

    const eventCodes = defs.map((d) => String(d.event_code));

    // Prevent dupes: only insert codes not already present for this meet.
    const { data: existing, error: existingErr } = await supabase
      .from("meet_events")
      .select("event_type")
      .eq("meet_id", meetId);

    if (existingErr) return { ok: false, error: existingErr.message };

    const existingSet = new Set((existing ?? []).map((r: any) => String(r.event_type)));
    const toInsert = eventCodes.filter((code) => !existingSet.has(code));

    if (toInsert.length === 0) {
      revalidatePath(buildPathToRevalidate);
      return { ok: true, inserted: 0, sport, eventCodes };
    }

    // Satisfy one-hot state check:
    // - For XC_*: xc_state must be non-null, tf_state/field_state must be null.
    // Enum underlying type is mm_xc_race_state; valid values include:
    // __PLACEHOLDER__, not_started, in_progress, paused, completed
    const rows = toInsert.map((code) => ({
      meet_id: meetId,
      event_type: code, // mm_event_type enum includes XC_5K, XC_6K, etc.
      xc_state: "not_started",
      tf_state: null,
      field_state: null,
      scheduled_at: null,
    }));

    const { error: insErr } = await supabase.from("meet_events").insert(rows);
    if (insErr) return { ok: false, error: insErr.message };

    revalidatePath(buildPathToRevalidate);
    return { ok: true, inserted: rows.length, sport, eventCodes };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Unknown error" };
  }
}
