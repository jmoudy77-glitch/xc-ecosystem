/* File: app/actions/meet_manager/getBuildMeetOptions.ts */
"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export type BuildMeetOption = {
  meetId: string;
  meetType: "XC" | "TF" | string;
  lifecycleState: string;
  startDate: string; // ISO date string
  role: "HOST" | "ATTENDEE" | string;
  location: any | null; // meets.location (jsonb)
};

function supabaseServer(cookieStore: any) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)."
    );
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

function sortSoonest(a: BuildMeetOption, b: BuildMeetOption) {
  const ad = a.startDate ? Date.parse(a.startDate) : Number.POSITIVE_INFINITY;
  const bd = b.startDate ? Date.parse(b.startDate) : Number.POSITIVE_INFINITY;
  if (ad !== bd) return ad - bd;

  // Stable tie-breaker
  if (a.meetType !== b.meetType) return String(a.meetType).localeCompare(String(b.meetType));
  return String(a.meetId).localeCompare(String(b.meetId));
}

export async function getBuildMeetOptions(
  programId: string
): Promise<{
  hosted: BuildMeetOption[];
  attending: BuildMeetOption[];
  attendingForHosted: BuildMeetOption[];
}> {
  const cookieStore = (await cookies()) as any;
  const supabase = supabaseServer(cookieStore);

  // Core spine only:
  // - meet_participants: meet_id, program_id, role
  // - meets: id, meet_type, lifecycle_state, start_date, location
  const { data, error } = await supabase
    .from("meet_participants")
    .select(
      `
        meet_id,
        role,
        meets:meets (
          id,
          meet_type,
          lifecycle_state,
          start_date,
          location
        )
      `
    )
    .eq("program_id", programId);

  if (error) throw error;

  const rows = Array.isArray(data) ? data : [];

  const normalize = (row: any): BuildMeetOption | null => {
    const m = row?.meets;
    const meetId = row?.meet_id ?? m?.id;
    if (!meetId) return null;

    return {
      meetId: String(meetId),
      meetType: String(m?.meet_type ?? ""),
      lifecycleState: String(m?.lifecycle_state ?? ""),
      startDate: String(m?.start_date ?? ""),
      role: String(row?.role ?? ""),
      location: m?.location ?? null,
    };
  };

  const all = rows.map(normalize).filter(Boolean) as BuildMeetOption[];

  const hosted = all.filter((x) => x.role === "HOST").sort(sortSoonest);
  const attending = all.filter((x) => x.role === "ATTENDEE").sort(sortSoonest);

  // Contract: hosted meet has corresponding attended context for the same coach hat-switch.
  // Surface this as an attending option with identical meet_id.
  const attendingForHosted: BuildMeetOption[] = hosted
    .map((h) => ({
      ...h,
      role: "ATTENDEE",
    }))
    .sort(sortSoonest);

  return { hosted, attending, attendingForHosted };
}
