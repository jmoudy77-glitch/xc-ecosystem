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

type RawRow = {
  athlete_id: string;
  relationship_type?: string | null;
  archived_at?: string | null;
  athlete?: { id: string; first_name: string; last_name: string } | null;
};

function collapse(rows: RawRow[]): BuildAthlete[] {
  const byAthleteId = new Map<string, BuildAthlete>();

  for (const r of rows) {
    const a = (r as any)?.athlete;
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

export async function getProgramAthletesForBuild(programId: string): Promise<BuildAthlete[]> {
  const cookieStore = (await cookies()) as any;
  const supabase = supabaseServer(cookieStore);

  // athletes table does NOT have program_id.
  // Program membership is represented via program_athletes (program_id, athlete_id).
  //
  // We must return a canonical, de-duped athlete set suitable for Build.
  // However, relationship_type values vary across environments/data.
  // Strategy:
  //  1) Prefer active rows that are "returning" or "recruit"
  //  2) If that yields zero rows, fall back to ALL active rows (archived_at IS NULL)
  const baseSelect = `
    athlete_id,
    relationship_type,
    archived_at,
    athlete:athlete_id (
      id,
      first_name,
      last_name
    )
  `;

  const preferred = await supabase
    .from("program_athletes")
    .select(baseSelect)
    .eq("program_id", programId)
    .is("archived_at", null)
    .in("relationship_type", ["returning", "recruit"]);

  if (preferred.error) throw preferred.error;

  const preferredRows = (preferred.data ?? []) as RawRow[];

  if (preferredRows.length > 0) {
    return collapse(preferredRows);
  }

  const fallback = await supabase
    .from("program_athletes")
    .select(baseSelect)
    .eq("program_id", programId)
    .is("archived_at", null);

  if (fallback.error) throw fallback.error;

  const fallbackRows = (fallback.data ?? []) as RawRow[];
  return collapse(fallbackRows);
}
