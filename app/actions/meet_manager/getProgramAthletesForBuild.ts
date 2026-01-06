/* File: app/actions/meet_manager/getProgramAthletesForBuild.ts */
"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export type BuildAthlete = {
  athleteId: string;
  firstName: string;
  lastName: string;
};

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

export async function getProgramAthletesForBuild(programId: string): Promise<BuildAthlete[]> {
  const cookieStore = (await cookies()) as any;
  const supabase = supabaseServer(cookieStore);

  // athletes table does NOT have program_id.
  // Program membership is represented via program_athletes (program_id, athlete_id).
  //
  // Build requires a canonical, non-duplicated athlete set.
  // We enforce this by:
  // - excluding archived program_athletes rows
  // - limiting to relationship types that represent an active roster candidate set
  // - de-duping by athlete_id (stable client-side collapse)
  const { data, error } = await supabase
    .from("program_athletes")
    .select(
      `
      athlete_id,
      relationship_type,
      archived_at,
      athlete:athlete_id (
        id,
        first_name,
        last_name
      )
    `
    )
    .eq("program_id", programId)
    .is("archived_at", null)
    .in("relationship_type", ["returning", "recruit"]);

  if (error) throw error;

  const rows = (data ?? []) as any[];

  const byAthleteId = new Map<string, BuildAthlete>();

  for (const r of rows) {
    const a = r?.athlete;
    const athleteId = a?.id as string | undefined;
    const firstName = a?.first_name as string | undefined;
    const lastName = a?.last_name as string | undefined;

    if (!athleteId || !firstName || !lastName) continue;

    if (!byAthleteId.has(athleteId)) {
      byAthleteId.set(athleteId, { athleteId, firstName, lastName });
    }
  }

  const athletes = Array.from(byAthleteId.values());

  athletes.sort((a, b) => {
    const ln = a.lastName.localeCompare(b.lastName);
    if (ln !== 0) return ln;
    return a.firstName.localeCompare(b.firstName);
  });

  return athletes;
}
