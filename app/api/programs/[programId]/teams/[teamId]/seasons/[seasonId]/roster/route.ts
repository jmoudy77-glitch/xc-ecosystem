// app/api/programs/[programId]/teams/[teamId]/seasons/[seasonId]/roster/route.ts
// Team roster API: list and add athletes for a specific team season.
// Uses typed route params for Next.js 16, without assuming extra columns on athletes.

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Auth helper: ensure the current auth user belongs to this program.
async function assertProgramMembership(req: NextRequest, programId: string) {
  const { supabase } = supabaseServer(req);

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn(
      "[/api/programs/[programId]/teams/[teamId]/seasons/[seasonId]/roster] auth error:",
      authError,
    );
    return {
      ok: false as const,
      status: 401 as const,
      error: "Authentication error",
    };
  }

  if (!authUser) {
    return {
      ok: false as const,
      status: 401 as const,
      error: "Not authenticated",
    };
  }

  // Resolve internal users.id from auth_id
  const { data: userRow, error: userError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("auth_id", authUser.id)
    .maybeSingle();

  if (userError) {
    console.error(
      "[/api/programs/[programId]/teams/[teamId]/seasons/[seasonId]/roster] users lookup error:",
      userError,
    );
    return {
      ok: false as const,
      status: 500 as const,
      error: "Failed to resolve user record",
    };
  }

  if (!userRow) {
    return {
      ok: false as const,
      status: 403 as const,
      error: "No user record found for this account",
    };
  }

  const userId = userRow.id as string;

  // Check membership in program_members
  const { data: memberRow, error: memberError } = await supabaseAdmin
    .from("program_members")
    .select("id, role")
    .eq("program_id", programId)
    .eq("user_id", userId)
    .maybeSingle();

  if (memberError) {
    console.error(
      "[/api/programs/[programId]/teams/[teamId]/seasons/[seasonId]/roster] program_members lookup error:",
      memberError,
    );
    return {
      ok: false as const,
      status: 500 as const,
      error: "Failed to verify program membership",
    };
  }

  if (!memberRow) {
    return {
      ok: false as const,
      status: 403 as const,
      error: "You do not have access to this program",
    };
  }

  return { ok: true as const, status: 200 as const, error: null };
}

type RosterRow = {
  id: string;
  athlete_id: string;
  team_season_id: string;
  jersey_number: string | null;
  role: string | null;
  status: string | null;
  depth_order: number | null;
  notes: string | null;
  created_at: string | null;
};

// Body for creating a roster entry
type CreateRosterBody = {
  athleteId: string;
  jerseyNumber?: string | null;
  role?: string | null;
  status?: string | null;
  depthOrder?: number | null;
  notes?: string | null;
};

// Verify that the given season belongs to this program and team.
async function assertSeasonBelongsToTeamAndProgram(
  programId: string,
  teamId: string,
  seasonId: string,
) {
  const { data: seasonRow, error } = await supabaseAdmin
    .from("team_seasons")
    .select("id, team_id, program_id, academic_year, season_label")
    .eq("id", seasonId)
    .maybeSingle();

  if (error) {
    console.error(
      "[/api/programs/[programId]/teams/[teamId]/seasons/[seasonId]/roster] team_seasons lookup error:",
      error,
    );
    return {
      ok: false as const,
      status: 500 as const,
      error: "Failed to verify team season",
    };
  }

  if (!seasonRow) {
    return {
      ok: false as const,
      status: 404 as const,
      error: "Team season not found",
    };
  }

  if (seasonRow.program_id !== programId || seasonRow.team_id !== teamId) {
    return {
      ok: false as const,
      status: 400 as const,
      error: "Season does not belong to this team/program",
    };
  }

  return { ok: true as const, status: 200 as const, error: null };
}

// GET /api/programs/:programId/teams/:teamId/seasons/:seasonId/roster
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ programId: string; teamId: string; seasonId: string }> },
) {
  const { programId, teamId, seasonId } = await context.params;

  const authCheck = await assertProgramMembership(req, programId);
  if (!authCheck.ok) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.status },
    );
  }

  const seasonCheck = await assertSeasonBelongsToTeamAndProgram(
    programId,
    teamId,
    seasonId,
  );
  if (!seasonCheck.ok) {
    return NextResponse.json(
      { error: seasonCheck.error },
      { status: seasonCheck.status },
    );
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("team_roster")
      .select(
        `
        id,
        program_id,
        team_id,
        team_season_id,
        athlete_id,
        jersey_number,
        role,
        status,
        depth_order,
        notes,
        created_at
      `,
      )
      .eq("program_id", programId)
      .eq("team_id", teamId)
      .eq("team_season_id", seasonId)
      .order("depth_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error(
        "[/api/programs/[programId]/teams/[teamId]/seasons/[seasonId]/roster] select error:",
        error,
      );
      return NextResponse.json(
        { error: "Failed to load team roster" },
        { status: 500 },
      );
    }

    const roster: RosterRow[] =
      (data ?? []).map((row: any) => ({
        id: row.id,
        athlete_id: row.athlete_id,
        team_season_id: row.team_season_id,
        jersey_number: row.jersey_number,
        role: row.role,
        status: row.status,
        depth_order: row.depth_order,
        notes: row.notes,
        created_at: row.created_at,
      })) ?? [];

    return NextResponse.json(
      {
        programId,
        teamId,
        seasonId,
        roster,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error(
      "[/api/programs/[programId]/teams/[teamId]/seasons/[seasonId]/roster] Unexpected GET error:",
      err,
    );
    return NextResponse.json(
      { error: "Unexpected error loading roster" },
      { status: 500 },
    );
  }
}

// POST /api/programs/:programId/teams/:teamId/seasons/:seasonId/roster
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ programId: string; teamId: string; seasonId: string }> },
) {
  const { programId, teamId, seasonId } = await context.params;

  const authCheck = await assertProgramMembership(req, programId);
  if (!authCheck.ok) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.status },
    );
  }

  const seasonCheck = await assertSeasonBelongsToTeamAndProgram(
    programId,
    teamId,
    seasonId,
  );
  if (!seasonCheck.ok) {
    return NextResponse.json(
      { error: seasonCheck.error },
      { status: seasonCheck.status },
    );
  }

  let body: CreateRosterBody;
  try {
    body = (await req.json()) as CreateRosterBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const athleteId = (body.athleteId || "").trim();
  if (!athleteId) {
    return NextResponse.json(
      { error: "athleteId is required" },
      { status: 400 },
    );
  }

  try {
    // Optional: verify athlete exists (just check id)
    const { data: athleteRow, error: athleteError } = await supabaseAdmin
      .from("athletes")
      .select("id")
      .eq("id", athleteId)
      .maybeSingle();

    if (athleteError) {
      console.error(
        "[/api/programs/[programId]/teams/[teamId]/seasons/[seasonId]/roster] athlete lookup error:",
        athleteError,
      );
      return NextResponse.json(
        { error: "Failed to verify athlete" },
        { status: 500 },
      );
    }

    if (!athleteRow) {
      return NextResponse.json(
        { error: "Athlete not found" },
        { status: 404 },
      );
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("team_roster")
      .insert({
        program_id: programId,
        team_id: teamId,
        team_season_id: seasonId,
        athlete_id: athleteId,
        jersey_number: body.jerseyNumber ?? null,
        role: body.role ?? "athlete",
        status: body.status ?? "active",
        depth_order: body.depthOrder ?? null,
        notes: body.notes ?? null,
      })
      .select(
        `
        id,
        program_id,
        team_id,
        team_season_id,
        athlete_id,
        jersey_number,
        role,
        status,
        depth_order,
        notes,
        created_at
      `,
      )
      .single();

    if (error) {
      console.error(
        "[/api/programs/[programId]/teams/[teamId]/seasons/[seasonId]/roster] insert error:",
        error,
      );
      if (typeof error.code === "string" && error.code === "23505") {
        return NextResponse.json(
          {
            error:
              "This athlete is already on the roster for this team season.",
          },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: "Failed to add athlete to roster" },
        { status: 500 },
      );
    }

    const rosterRow: RosterRow = {
      id: inserted.id,
      athlete_id: inserted.athlete_id,
      team_season_id: inserted.team_season_id,
      jersey_number: inserted.jersey_number,
      role: inserted.role,
      status: inserted.status,
      depth_order: inserted.depth_order,
      notes: inserted.notes,
      created_at: inserted.created_at,
    };

    return NextResponse.json(
      {
        programId,
        teamId,
        seasonId,
        rosterEntry: rosterRow,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error(
      "[/api/programs/[programId]/teams/[teamId]/seasons/[seasonId]/roster] Unexpected POST error:",
      err,
    );
    return NextResponse.json(
      { error: "Unexpected error adding athlete to roster" },
      { status: 500 },
    );
  }
}
