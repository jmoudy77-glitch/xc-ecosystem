// app/api/programs/[programId]/recruits/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseServer } from "@/lib/supabaseServer";

// --- helpers ---

function parseProgramIdFromUrl(url: string): string | null {
  const { pathname } = new URL(url);
  const parts = pathname.split("/").filter(Boolean);
  // ["api", "programs", programId, "recruits"]
  const idx = parts.indexOf("programs");
  if (idx === -1 || idx + 1 >= parts.length) return null;
  return parts[idx + 1] || null;
}

async function assertProgramMembership(
  req: NextRequest,
  programId: string
): Promise<
  | { ok: true; viewerUserId: string; role: string | null }
  | { ok: false; status: number; error: string }
> {
  const { supabase } = supabaseServer(req);

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn("[ProgramRecruits] auth.getUser error:", authError.message);
  }

  if (!authUser) {
    return { ok: false, status: 401, error: "Not authenticated" };
  }

  const authId = authUser.id;

  // map auth user -> public.users row
  const { data: userRow, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, auth_id")
    .eq("auth_id", authId)
    .maybeSingle();

  if (userError) {
    console.error("[ProgramRecruits] users select error:", userError);
    return { ok: false, status: 500, error: "Failed to load viewer record" };
  }

  if (!userRow) {
    return {
      ok: false,
      status: 403,
      error: "User record not found for this account",
    };
  }

  const viewerUserId = userRow.id as string;

  const { data: membershipRow, error: membershipError } = await supabaseAdmin
    .from("program_members")
    .select("id, role")
    .eq("program_id", programId)
    .eq("user_id", viewerUserId)
    .maybeSingle();

  if (membershipError) {
    console.error("[ProgramRecruits] membership error:", membershipError);
    return {
      ok: false,
      status: 500,
      error: "Failed to verify program membership",
    };
  }

  if (!membershipRow) {
    return {
      ok: false,
      status: 403,
      error: "You are not a member of this program",
    };
  }

  const role = (membershipRow.role as string | null) ?? null;

  return { ok: true, viewerUserId, role };
}

// --- GET: list roster-eligible recruits for a program ---

export async function GET(req: NextRequest) {
  const programId = parseProgramIdFromUrl(req.url);

  if (!programId) {
    return NextResponse.json(
      { error: "Missing programId in path" },
      { status: 400 }
    );
  }

  const authCheck = await assertProgramMembership(req, programId);
  if (!authCheck.ok) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.status }
    );
  }

  // which statuses are allowed to be added to a roster
  const eligibleStatuses = ["signed", "enrolled", "committed", "walk_on"];

  const { data: rows, error } = await supabaseAdmin
    .from("program_recruits")
    .select(
      `
      id,
      program_id,
      status,
      source,
      recruiting_profile:recruiting_profiles!inner (
        id,
        profile_type,
        athlete:athletes!inner (
          id,
          first_name,
          last_name,
          grad_year,
          event_group
        )
      )
    `
    )
    .eq("program_id", programId)
    .in("status", eligibleStatuses);

  if (error) {
    console.error("[ProgramRecruits] select error:", error);
    return NextResponse.json(
      { error: "Failed to load recruits" },
      { status: 500 }
    );
  }

  const recruits = (rows ?? []).map((row: any) => {
    const profileRel = row.recruiting_profile;
    const profileRecord = Array.isArray(profileRel)
      ? profileRel[0]
      : profileRel;

    const athleteRel = profileRecord?.athlete;
    const athleteRecord = Array.isArray(athleteRel)
      ? athleteRel[0]
      : athleteRel;

    const firstName =
      (athleteRecord?.first_name as string | null) ?? null;
    const lastName =
      (athleteRecord?.last_name as string | null) ?? null;
    const gradYear =
      (athleteRecord?.grad_year as number | null) ?? null;
    const eventGroup =
      (athleteRecord?.event_group as string | null) ?? null;

    // Build a nice label like "Jane Doe · 2026 · Distance"
    const namePart = [firstName, lastName].filter(Boolean).join(" ").trim();
    const tags: string[] = [];
    if (gradYear) tags.push(String(gradYear));
    if (eventGroup) tags.push(eventGroup);
    const labelBase = namePart || `Athlete ${athleteRecord?.id ?? ""}`;
    const label =
      tags.length > 0 ? `${labelBase} · ${tags.join(" · ")}` : labelBase;

    return {
      programRecruitId: row.id as string,
      status: (row.status as string) ?? "evaluating",
      source: (row.source as string) ?? "coach_manual",
      profileType: (profileRecord?.profile_type as string) ?? "hs",
      athleteId: (athleteRecord?.id as string) ?? null,
      // we don't have email/avatar in this table yet, keep them nullable
      email: null as string | null,
      avatarUrl: null as string | null,
      label,
    };
  });

  return NextResponse.json(
    {
      programId,
      recruits,
    },
    { status: 200 }
  );
}