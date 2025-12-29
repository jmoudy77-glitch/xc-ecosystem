// app/api/programs/[programId]/teams/[teamId]/seasons/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseServer } from "@/lib/supabaseServer";

const MANAGER_ROLES = ["head_coach", "director", "admin"] as const;

// ---- helpers ----

function parseIdsFromUrl(url: string): {
  programId: string | null;
  teamId: string | null;
} {
  const { pathname } = new URL(url);
  const parts = pathname.split("/").filter(Boolean);
  // ["api","programs", programId, "teams", teamId, "seasons"]
  const idx = parts.indexOf("programs");
  if (idx === -1) {
    return { programId: null, teamId: null };
  }

  const programId = parts[idx + 1] ?? null;
  const teamsIdx = parts.indexOf("teams", idx);
  const teamId =
    teamsIdx !== -1 && teamsIdx + 1 < parts.length ? parts[teamsIdx + 1] : null;

  return { programId, teamId };
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
    console.warn("[CreateSeason] auth.getUser error:", authError.message);
  }

  if (!authUser) {
    return { ok: false, status: 401, error: "Not authenticated" };
  }

  const authId = authUser.id;

  const { data: userRow, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, auth_id")
    .eq("auth_id", authId)
    .maybeSingle();

  if (userError) {
    console.error("[CreateSeason] users select error:", userError);
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
    console.error("[CreateSeason] membership error:", membershipError);
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
      error: "Only head coaches / admins can create seasons",
    };
  }

  return { ok: true, viewerUserId, role };
}

// ---- POST: create a new season and auto-populate returning roster ----

export async function POST(req: NextRequest) {
  const { programId, teamId } = parseIdsFromUrl(req.url);

  if (!programId || !teamId) {
    return NextResponse.json(
      { error: "Missing programId or teamId in path" },
      { status: 400 }
    );
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

  const seasonLabel = (body?.season_label as string | undefined) ?? null;
  const seasonYear = (body?.season_year as number | undefined) ?? null;
  const rosterLockDateRaw = body?.roster_lock_date as string | null | undefined;

  if (!seasonLabel || !seasonYear) {
    return NextResponse.json(
      { error: "season_label and season_year are required" },
      { status: 400 }
    );
  }

  const rosterLockDate =
    rosterLockDateRaw && rosterLockDateRaw.length > 0
      ? new Date(rosterLockDateRaw).toISOString()
      : null;

  // 1) Create new season row
  const { data: newSeason, error: seasonError } = await supabaseAdmin
    .from("team_seasons")
    .insert({
      team_id: teamId,
      season_label: seasonLabel,
      season_year: seasonYear,
      roster_lock_date: rosterLockDate,
    })
    .select("id, team_id, season_label, season_year, roster_lock_date")
    .single();

  if (seasonError) {
    console.error("[CreateSeason] insert season error:", seasonError);
    return NextResponse.json(
      { error: "Failed to create team season" },
      { status: 500 }
    );
  }

  const newSeasonId = newSeason.id as string;

  // 2) Find most recent prior season for this team
  const { data: priorSeason, error: priorError } = await supabaseAdmin
    .from("team_seasons")
    .select("id, season_year, created_at")
    .eq("team_id", teamId)
    .neq("id", newSeasonId)
    .order("season_year", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (priorError) {
    console.error("[CreateSeason] prior season lookup error:", priorError);
    // not fatal; we just won't copy roster
  }

  let copiedCount = 0;

  if (priorSeason) {
    // 3) Load prior season roster (returning athletes only)
    const { data: priorRoster, error: rosterError } = await supabaseAdmin
      .from("team_roster")
      .select(
        `
        athlete_id,
        program_recruit_id,
        status,
        role
      `
      )
      .eq("team_season_id", priorSeason.id)
      // exclude non-returners; you can tweak this list as needed
      .not("status", "in", '("graduated","removed","transfer_out")');

    if (rosterError) {
      console.error("[CreateSeason] prior roster select error:", rosterError);
      // again, not fatal; we just won't copy
    } else if (priorRoster && priorRoster.length > 0) {
      // 4) Build new roster rows for this season
      const newRosterRows = priorRoster.map((row) => ({
        program_id: programId,
        team_id: teamId,
        team_season_id: newSeasonId,
        athlete_id: row.athlete_id,
        program_recruit_id: row.program_recruit_id,
        // you can choose to reset some statuses to "active" if you want:
        status: row.status ?? "active",
        role: row.role ?? null,
      }));

      const { error: insertRosterError } = await supabaseAdmin
        .from("team_roster")
        .insert(newRosterRows);

      if (insertRosterError) {
        console.error(
          "[CreateSeason] insert new roster error:",
          insertRosterError
        );
      } else {
        copiedCount = newRosterRows.length;
      }
    }
  }

  return NextResponse.json(
    {
      ok: true,
      season: newSeason,
      copiedRosterCount: copiedCount,
    },
    { status: 201 }
  );
}