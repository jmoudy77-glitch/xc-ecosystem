// app/api/programs/[programId]/teams/[teamId]/seasons/[seasonId]/roster/add-recruit/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseServer } from "@/lib/supabaseServer";

const MANAGER_ROLES = ["head_coach", "director", "admin"] as const;

// ---- helpers ----

function parseIdsFromUrl(url: string): {
  programId: string | null;
  teamId: string | null;
  seasonId: string | null;
} {
  const { pathname } = new URL(url);
  const parts = pathname.split("/").filter(Boolean);
  // ["api","programs", programId, "teams", teamId, "seasons", seasonId, "roster", "add-recruit"]
  const idx = parts.indexOf("programs");
  if (idx === -1) {
    return { programId: null, teamId: null, seasonId: null };
  }

  const programId = parts[idx + 1] ?? null;
  const teamsIdx = parts.indexOf("teams", idx);
  const seasonsIdx = parts.indexOf("seasons", idx);

  const teamId =
    teamsIdx !== -1 && teamsIdx + 1 < parts.length ? parts[teamsIdx + 1] : null;
  const seasonId =
    seasonsIdx !== -1 && seasonsIdx + 1 < parts.length
      ? parts[seasonsIdx + 1]
      : null;

  return { programId, teamId, seasonId };
}

async function assertProgramManager(
  req: NextRequest,
  programId: string
): Promise<
  | { ok: true; viewerUserId: string; role: string | null }
  | { ok: false; status: number; error: string }
> {
  const { supabase } = await supabaseServer(req);

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn("[AddRecruit] auth.getUser error:", authError.message);
  }

  if (!authUser) {
    return { ok: false, status: 401, error: "Not authenticated" };
  }

  const authId = authUser.id;

  // Map auth user -> users row
  const { data: userRow, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, auth_id")
    .eq("auth_id", authId)
    .maybeSingle();

  if (userError) {
    console.error("[AddRecruit] users select error:", userError);
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

  // Check membership & role
  const { data: membershipRow, error: membershipError } = await supabaseAdmin
    .from("program_members")
    .select("id, role")
    .eq("program_id", programId)
    .eq("user_id", viewerUserId)
    .maybeSingle();

  if (membershipError) {
    console.error("[AddRecruit] membership error:", membershipError);
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
  const isManager =
    !!role &&
    MANAGER_ROLES.includes(
      role.toLowerCase() as (typeof MANAGER_ROLES)[number]
    );

  if (!isManager) {
    return {
      ok: false,
      status: 403,
      error: "Only head coaches / admins can modify the roster",
    };
  }

  return { ok: true, viewerUserId, role };
}

// ---- POST: add a recruit (by program_recruit_id) to this season's roster ----

export async function POST(req: NextRequest) {
  const { programId, teamId, seasonId } = parseIdsFromUrl(req.url);

  if (!programId || !teamId || !seasonId) {
    return NextResponse.json(
      { error: "Missing programId, teamId, or seasonId in path" },
      { status: 400 }
    );
  }

    // Check roster lock for this season
  const { data: seasonRow, error: seasonError } = await supabaseAdmin
    .from("team_seasons")
    .select("id, roster_lock_date")
    .eq("id", seasonId)
    .maybeSingle();

  if (seasonError) {
    console.error("[AddRecruit] season lookup error:", seasonError);
    return NextResponse.json(
      { error: "Failed to load season" },
      { status: 500 }
    );
  }

  if (!seasonRow) {
    return NextResponse.json(
      { error: "Season not found" },
      { status: 404 }
    );
  }

  const lockDate = seasonRow.roster_lock_date as string | null;
  if (lockDate) {
    const now = new Date();
    const lockedAt = new Date(lockDate);
    if (now >= lockedAt) {
      return NextResponse.json(
        {
          error:
            "Roster is locked for this season per conference rules; no further changes are allowed.",
        },
        { status: 403 }
      );
    }
  }

  const authCheck = await assertProgramManager(req, programId);
  if (!authCheck.ok) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.status }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const programRecruitId =
    (body?.program_recruit_id as string | undefined) ?? null;
  const rosterStatus = (body?.status as string | undefined) ?? "active";
  const rosterRole = (body?.role as string | undefined) ?? null;

  if (!programRecruitId) {
    return NextResponse.json(
      { error: "program_recruit_id is required" },
      { status: 400 }
    );
  }

  // 1) Resolve program_recruits -> recruiting_profiles -> athletes
  const { data: prRow, error: prError } = await supabaseAdmin
    .from("program_recruits")
    .select(
      `
      id,
      program_id,
      status,
      recruiting_profile:recruiting_profiles!inner (
        id,
        athlete:athletes!inner (
          id
        )
      )
    `
    )
    .eq("id", programRecruitId)
    .maybeSingle();

  if (prError) {
    console.error("[AddRecruit] program_recruits lookup error:", prError);
    return NextResponse.json(
      { error: "Failed to resolve recruiting record" },
      { status: 500 }
    );
  }

  if (!prRow) {
    return NextResponse.json(
      { error: "Recruiting record not found" },
      { status: 404 }
    );
  }

  if ((prRow.program_id as string) !== programId) {
    return NextResponse.json(
      { error: "Recruit does not belong to this program" },
      { status: 403 }
    );
  }

  const profileRel = (prRow as any).recruiting_profile;
  const profileRecord = Array.isArray(profileRel) ? profileRel[0] : profileRel;
  const athleteRel = profileRecord?.athlete;
  const athleteRecord = Array.isArray(athleteRel) ? athleteRel[0] : athleteRel;

  if (!athleteRecord) {
    return NextResponse.json(
      { error: "Recruiting profile missing athlete" },
      { status: 500 }
    );
  }

  const athleteId = athleteRecord.id as string;

  // 2) Prevent duplicate roster entries for this athlete in this season
  const { data: existingRow, error: existingError } = await supabaseAdmin
    .from("team_roster")
    .select("id")
    .eq("team_season_id", seasonId)
    .eq("athlete_id", athleteId)
    .maybeSingle();

  if (existingError) {
    console.error("[AddRecruit] duplicate check error:", existingError);
    return NextResponse.json(
      { error: "Failed to check existing roster entry" },
      { status: 500 }
    );
  }

  if (existingRow) {
    return NextResponse.json(
      { error: "Athlete is already on this season's roster" },
      { status: 409 }
    );
  }

  // 3) Insert roster entry (now including program_id and team_id)
  const { data: rosterEntry, error: insertError } = await supabaseAdmin
    .from("team_roster")
    .insert({
      program_id: programId,
      team_id: teamId,
      team_season_id: seasonId,
      athlete_id: athleteId,
      program_recruit_id: programRecruitId,
      status: rosterStatus,
      role: rosterRole,
    })
    .select(
      `
      id,
      program_id,
      team_id,
      team_season_id,
      athlete_id,
      program_recruit_id,
      status,
      role,
      created_at
    `
    )
    .single();

  if (insertError) {
    console.error("[AddRecruit] insert error:", insertError);
    return NextResponse.json(
      { error: "Failed to add athlete to roster" },
      { status: 500 }
    );
  }

  // 4) (Optional) bump recruiting status if it's not already "enrolled"
  try {
    await supabaseAdmin
      .from("program_recruits")
      .update({
        status:
          (prRow.status as string) === "enrolled"
            ? prRow.status
            : "enrolled",
      })
      .eq("id", programRecruitId);
  } catch (e) {
    console.warn("[AddRecruit] failed to update recruit status:", e);
  }

  return NextResponse.json(
    { ok: true, rosterEntry },
    { status: 201 }
  );
}