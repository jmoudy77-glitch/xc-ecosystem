/* File: app/actions/meet_manager/createMeet.ts */
"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type CreateMeetInput = {
  programId: string;
  meetType: "XC" | "TF";
  startDate: string; // yyyy-mm-dd
  locationLabel?: string; // stored into meets.location jsonb
  isInvitational?: boolean;
};

function supabaseServer(cookieStore: any) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).");
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

export async function createMeet(input: CreateMeetInput): Promise<{ meetId: string }> {
  const cookieStore = (await cookies()) as any;
  const supabase = supabaseServer(cookieStore);

  const location =
    input.locationLabel && input.locationLabel.trim().length > 0
      ? { label: input.locationLabel.trim() }
      : null;

  // 1) Create meet
  const { data: meetRow, error: meetErr } = await supabase
    .from("meets")
    .insert({
      host_program_id: input.programId,
      meet_type: input.meetType,
      lifecycle_state: "draft",
      start_date: input.startDate,
      location,
      is_invitational: Boolean(input.isInvitational),
    })
    .select("id")
    .single();

  if (meetErr) throw meetErr;

  const meetId = String(meetRow.id);

  // 2) Ensure host participant exists
  const { error: partErr } = await supabase.from("meet_participants").insert({
    meet_id: meetId,
    program_id: input.programId,
    role: "HOST",
    join_state: "joined",
  });

  if (partErr) throw partErr;

  // 3) Create host roster shell (durable, aligns to roster membership pivot)
  const { error: rosterErr } = await supabase.from("meet_rosters").insert({
    meet_id: meetId,
    program_id: input.programId,
    roster_state: "draft",
  });

  if (rosterErr) throw rosterErr;

  return { meetId };
}
