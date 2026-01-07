"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type SeedArgs = {
  meetId: string;
  buildPathToRevalidate: string;
};

type SeedOk = {
  ok: true;
  inserted: number;
  sport: string;
  eventCodes: string[];
};

type SeedErr = {
  ok: false;
  error: string;
};

function supabaseServer() {
  const cookieStore = cookies() as any;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          if (cookieStore && typeof cookieStore.get === "function") {
            return cookieStore.get(name)?.value;
          }
          if (cookieStore && typeof cookieStore.getAll === "function") {
            return cookieStore.getAll().find((c: any) => c?.name === name)?.value;
          }
          return undefined;
        },
        set(name: string, value: string, options: any) {
          if (cookieStore && typeof cookieStore.set === "function") {
            cookieStore.set({ name, value, ...options });
          }
        },
        remove(name: string, options: any) {
          if (cookieStore && typeof cookieStore.delete === "function") {
            cookieStore.delete({ name, ...options });
          }
        },
      },
    }
  );
}

function meetTypeToSport(meetType: string): "xc" | "track" | "field" {
  const t = (meetType || "").toUpperCase();
  if (t === "TRACK") return "track";
  if (t === "FIELD") return "field";
  // Default XC
  return "xc";
}

/**
 * Seeds meet_events for a hosted meet from event_definitions (sport-based).
 * Enforces the meet_events_state_onehot_chk by setting the proper *_state column.
 */
export async function seedMeetEventsForHostedBuild(
  args: SeedArgs
): Promise<SeedOk | SeedErr> {
  const { meetId, buildPathToRevalidate } = args;

  try {
    const supabase = supabaseServer();

    const { data: meetRow, error: meetErr } = await supabase
      .from("meets")
      .select("id, meet_type")
      .eq("id", meetId)
      .maybeSingle();

    if (meetErr) return { ok: false, error: meetErr.message };
    if (!meetRow) return { ok: false, error: "Meet not found." };

    const sport = meetTypeToSport(String((meetRow as any).meet_type));

    const { data: defs, error: defErr } = await supabase
      .from("event_definitions")
      .select("event_code, sport, display_name")
      .eq("sport", sport)
      .order("event_code", { ascending: true });

    if (defErr) return { ok: false, error: defErr.message };
    if (!defs || defs.length === 0) {
      return { ok: false, error: `No event_definitions found for sport='${sport}'.` };
    }

    const eventCodes = defs.map((d: any) => String(d.event_code));

    // meet_events columns: meet_id, event_type, xc_state, tf_state, field_state, scheduled_at (nullable)
    const rows = eventCodes.map((event_code) => {
      const isXC = event_code.toUpperCase().startsWith("XC_");
      const isTRACK = event_code.toUpperCase().startsWith("TRACK");
      const isFIELD = event_code.toUpperCase().startsWith("FIELD");

      return {
        meet_id: meetId,
        event_type: event_code,
        xc_state: isXC ? "not_started" : null,
        tf_state: isTRACK ? "not_started" : null,
        field_state: isFIELD ? "not_started" : null,
      };
    });

    // Upsert avoids duplicate re-seeding; onConflict assumes a unique constraint exists on (meet_id, event_type).
    const { error: upsertErr } = await supabase
      .from("meet_events")
      .upsert(rows as any, { onConflict: "meet_id,event_type" });

    if (upsertErr) return { ok: false, error: upsertErr.message };

    revalidatePath(buildPathToRevalidate);

    return {
      ok: true,
      inserted: rows.length,
      sport,
      eventCodes,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Unknown error." };
  }
}
