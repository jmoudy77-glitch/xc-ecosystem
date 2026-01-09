// app/actions/recruiting/persistRecruitingPrimary.ts

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type PersistPrimaryArgs = {
  programId: string;
  sport?: string;
  eventGroupKey: string;
  slotId: string;
  primaryAthleteId: string | null;
  athleteType: "returning" | "recruit";
};

export async function persistRecruitingPrimary({
  programId,
  sport = "xc",
  eventGroupKey,
  slotId,
  primaryAthleteId,
  athleteType,
}: PersistPrimaryArgs) {
  const cookieStore = cookies() as any;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
      },
    }
  );

  // Clear any existing PRIMARY for this slot
  await supabase
    .from("recruiting_slot_assignments")
    .update({ is_primary: false })
    .eq("program_id", programId)
    .eq("sport", sport)
    .eq("event_group_key", eventGroupKey)
    .eq("slot_id", slotId)
    .eq("is_primary", true);

  if (!primaryAthleteId) return;

  // Upsert PRIMARY row
  await supabase
    .from("recruiting_slot_assignments")
    .upsert(
      {
        program_id: programId,
        sport,
        event_group_key: eventGroupKey,
        slot_id: slotId,
        athlete_id: primaryAthleteId,
        athlete_type: athleteType,
        is_primary: true,
      },
      {
        onConflict:
          "program_id,sport,event_group_key,slot_id,athlete_id",
      }
    );
}
