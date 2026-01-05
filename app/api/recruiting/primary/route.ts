// app/api/recruiting/primary/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Body = {
  programId: string;
  sport?: string;
  eventGroupKey: string;
  slotId: string;
  primaryAthleteId: string | null;
  athleteType: "returning" | "recruit";
};

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) return badRequest("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceKey) return badRequest("Missing SUPABASE_SERVICE_ROLE_KEY");

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (!body?.programId) return badRequest("programId is required");
  if (!body?.eventGroupKey) return badRequest("eventGroupKey is required");
  if (!body?.slotId) return badRequest("slotId is required");
  if (!body?.athleteType) return badRequest("athleteType is required");

  if (body.athleteType !== "returning" && body.athleteType !== "recruit") {
    return badRequest("athleteType must be 'returning' | 'recruit'");
  }

  const sport = body.sport ?? "xc";

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Clear any existing PRIMARY for this slot
  const clearRes = await supabase
    .from("recruiting_slot_assignments")
    .update({ is_primary: false })
    .eq("program_id", body.programId)
    .eq("sport", sport)
    .eq("event_group_key", body.eventGroupKey)
    .eq("slot_id", body.slotId)
    .eq("is_primary", true);

  if (clearRes.error) {
    return NextResponse.json({ error: clearRes.error.message }, { status: 500 });
  }

  if (!body.primaryAthleteId) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // Upsert PRIMARY row
  const upsertRes = await supabase
    .from("recruiting_slot_assignments")
    .upsert(
      {
        program_id: body.programId,
        sport,
        event_group_key: body.eventGroupKey,
        slot_id: body.slotId,
        athlete_id: body.primaryAthleteId,
        athlete_type: body.athleteType,
        is_primary: true,
      },
      {
        onConflict: "program_id,sport,event_group_key,slot_id,athlete_id",
      }
    );

  if (upsertRes.error) {
    return NextResponse.json({ error: upsertRes.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
