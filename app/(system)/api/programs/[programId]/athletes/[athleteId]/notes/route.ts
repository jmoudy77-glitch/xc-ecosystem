// app/(system)/api/programs/[programId]/athletes/[athleteId]/notes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

async function requireProgramMember(
  supabase: any,
  programId: string,
  authUserId: string
) {
  // Map auth user -> app user (public.users)
  const { data: appUser, error: appUserErr } = await supabase
    .from("users")
    .select("id, name")
    .eq("auth_id", authUserId)
    .limit(1)
    .maybeSingle();

  if (appUserErr) throw new Error(appUserErr.message);
  if (!appUser) return { ok: false as const, status: 403, error: "User record not found" };

  // Must be a member of the program
  const { data: member, error: memberErr } = await supabase
    .from("program_members")
    .select("id")
    .eq("program_id", programId)
    .eq("user_id", appUser.id)
    .limit(1)
    .maybeSingle();

  if (memberErr) throw new Error(memberErr.message);
  if (!member) return { ok: false as const, status: 403, error: "Forbidden" };

  return { ok: true as const, appUserId: appUser.id, appUserName: appUser.name ?? null };
}

async function requireProgramAthlete(
  supabase: any,
  programId: string,
  athleteId: string
) {
  const { data: pa, error: paErr } = await supabase
    .from("program_athletes")
    .select("id")
    .eq("program_id", programId)
    .eq("athlete_id", athleteId)
    .is("archived_at", null)
    .limit(1)
    .maybeSingle();

  if (paErr) throw new Error(paErr.message);
  if (!pa) return { ok: false as const, status: 404, error: "Athlete not found for this program" };

  return { ok: true as const };
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ programId: string; athleteId: string }> }
) {
  try {
    const { programId, athleteId } = await ctx.params;
    const { supabase } = supabaseServer(req);

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberGate = await requireProgramMember(supabase, programId, user.id);
    if (!memberGate.ok) {
      return NextResponse.json({ error: memberGate.error }, { status: memberGate.status });
    }

    const athleteGate = await requireProgramAthlete(supabase, programId, athleteId);
    if (!athleteGate.ok) {
      return NextResponse.json({ error: athleteGate.error }, { status: athleteGate.status });
    }

    const { data: note, error: noteErr } = await supabase
      .from("program_athlete_notes")
      .select("id, program_id, athlete_id, body, created_by_user_id, updated_at")
      .eq("program_id", programId)
      .eq("athlete_id", athleteId)
      .limit(1)
      .maybeSingle();

    if (noteErr) {
      return NextResponse.json({ error: noteErr.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        note: note ?? null,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to load notes" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ programId: string; athleteId: string }> }
) {
  try {
    const { programId, athleteId } = await ctx.params;
    const { supabase } = supabaseServer(req);

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberGate = await requireProgramMember(supabase, programId, user.id);
    if (!memberGate.ok) {
      return NextResponse.json({ error: memberGate.error }, { status: memberGate.status });
    }

    const athleteGate = await requireProgramAthlete(supabase, programId, athleteId);
    if (!athleteGate.ok) {
      return NextResponse.json({ error: athleteGate.error }, { status: athleteGate.status });
    }

    const bodyJson = await req.json().catch(() => ({}));
    const body = typeof bodyJson?.body === "string" ? bodyJson.body : "";

    const { data: upserted, error: upErr } = await supabase
      .from("program_athlete_notes")
      .upsert(
        {
          program_id: programId,
          athlete_id: athleteId,
          body,
          created_by_user_id: memberGate.appUserId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "program_id,athlete_id" }
      )
      .select("id, program_id, athlete_id, body, created_by_user_id, updated_at")
      .single();

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 400 });
    }

    return NextResponse.json({ note: upserted }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to save notes" },
      { status: 500 }
    );
  }
}