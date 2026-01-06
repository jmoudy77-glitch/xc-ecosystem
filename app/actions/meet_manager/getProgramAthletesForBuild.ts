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

  const { data, error } = await supabase
    .from("athletes")
    .select("id, first_name, last_name")
    .eq("program_id", programId)
    .order("last_name", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((a: any) => ({
    athleteId: a.id,
    firstName: a.first_name,
    lastName: a.last_name,
  }));
}
