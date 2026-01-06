/* File: app/actions/meet_manager/toggleMeetRosterAthlete.ts */
"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@supabase/ssr";

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
      set() {},
      remove() {},
    },
  });
}

export async function toggleMeetRosterAthlete(
  programId: string,
  meetId: string,
  athleteId: string,
  include: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cookieStore = (await cookies()) as any;
  const supabase = supabaseServer(cookieStore);

  if (!programId || !meetId || !athleteId) {
    return { ok: false, error: "Missing required identifiers." };
  }

  if (include) {
    // Idempotent add: prevent duplicates even without a DB-level uniqueness constraint.
    const { data: existing, error: existingErr } = await supabase
      .from("meet_roster_athletes")
      .select("id")
      .eq("program_id", programId)
      .eq("meet_id", meetId)
      .eq("athlete_id", athleteId)
      .limit(1);

    if (existingErr) return { ok: false, error: existingErr.message };

    if (!existing || existing.length === 0) {
      const { error: insErr } = await supabase.from("meet_roster_athletes").insert({
        program_id: programId,
        meet_id: meetId,
        athlete_id: athleteId,
        attendance_state: "attending",
      });

      if (insErr) return { ok: false, error: insErr.message };
    }
  } else {
    // Idempotent remove: delete any accidental duplicates.
    const { error: delErr } = await supabase
      .from("meet_roster_athletes")
      .delete()
      .eq("program_id", programId)
      .eq("meet_id", meetId)
      .eq("athlete_id", athleteId);

    if (delErr) return { ok: false, error: delErr.message };
  }

  revalidatePath(`/programs/${programId}/meets/builder`);
  return { ok: true };
}
