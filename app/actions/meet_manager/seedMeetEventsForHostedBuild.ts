/* File: app/actions/meet_manager/seedMeetEventsForHostedBuild.ts */
"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { revalidatePath } from "next/cache";

function supabaseServer(cookieStore: any) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase env vars.");
  }

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      // Server Components: avoid TS cookie-set errors; mutations occur via route handlers/actions
      set() {},
      remove() {},
    },
  });
}

type SeedResult =
  | { ok: true; status: "seeded"; inserted: number }
  | { ok: true; status: "already_seeded"; inserted: number }
  | { ok: false; error: string };

function normalizeSportKey(meetType: unknown): "xc" | "tf" | null {
  const mt = String(meetType ?? "").toLowerCase();

  // Conservative mapping: treat any meet_type containing "xc" as xc, else any containing "tf" or "track" as tf.
  // If neither, return null and let caller display an actionable error.
  if (mt.includes("xc") || mt.includes("cross")) return "xc";
  if (mt.includes("tf") || mt.includes("track")) return "tf";
  return null;
}

export async function seedMeetEventsForHostedBuild(args: {
  programId: string;
  hostMeetId: string;
  builderPath: string;
}): Promise<SeedResult> {
  const { programId, hostMeetId, builderPath } = args;

  if (!programId || !hostMeetId || !builderPath) {
    return { ok: false, error: "Missing required parameters." };
  }

  const cookieStore = (await cookies()) as any;
  const supabase = supabaseServer(cookieStore);

  const { count: existingCount, error: existingErr } = await supabase
    .from("meet_events")
    .select("id", { count: "exact", head: true })
    .eq("meet_id", hostMeetId);

  if (existingErr) return { ok: false, error: existingErr.message };
  if ((existingCount ?? 0) > 0) {
    revalidatePath(builderPath);
    return { ok: true, status: "already_seeded", inserted: 0 };
  }

  const { data: meet, error: meetErr } = await supabase
    .from("meets")
    .select("id, meet_type, host_program_id")
    .eq("id", hostMeetId)
    .maybeSingle();

  if (meetErr) return { ok: false, error: meetErr.message };
  if (!meet) return { ok: false, error: "Meet not found." };

  // Guard: hosted meet must belong to program context
  if (String(meet.host_program_id) !== String(programId)) {
    return { ok: false, error: "Selected hosted meet does not belong to this program." };
  }

  const sportKey = normalizeSportKey((meet as any).meet_type);
  if (!sportKey) {
    return {
      ok: false,
      error:
        "Cannot infer sport from meet_type. Expected meet_type to include 'xc' or 'tf/track'.",
    };
  }

  const { data: defs, error: defsErr } = await supabase
    .from("event_definitions")
    .select("event_code")
    .eq("sport", sportKey)
    .order("display_name", { ascending: true });

  if (defsErr) return { ok: false, error: defsErr.message };

  const eventCodes = (defs ?? [])
    .map((d: any) => String(d.event_code ?? "").trim())
    .filter(Boolean);

  if (eventCodes.length === 0) {
    return { ok: false, error: `No event_definitions found for sport='${sportKey}'.` };
  }

  // meet_events.event_type is a DB enum. Assumption: enum labels match event_definitions.event_code.
  // If not, insertion will fail with a clear Postgres error which we return to UI.
  const insertRows = eventCodes.map((event_code) => ({
    meet_id: hostMeetId,
    event_type: event_code,
  }));

  const { error: insErr } = await supabase.from("meet_events").insert(insertRows);

  if (insErr) return { ok: false, error: insErr.message };

  revalidatePath(builderPath);
  return { ok: true, status: "seeded", inserted: insertRows.length };
}
