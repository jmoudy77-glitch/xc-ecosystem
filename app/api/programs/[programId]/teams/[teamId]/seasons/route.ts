// app/api/programs/[programId]/teams/[teamId]/seasons/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Helper: ensure the current auth user belongs to this program.
// Mirrors /api/programs/[programId]/teams and /staff.
async function assertProgramMembership(req: NextRequest, programId: string) {
  const { supabase } = supabaseServer(req);

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn(
      "[/api/programs/[programId]/teams/[teamId]/seasons] auth error:",
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

  // Check membership in program_members
  const { data: memberRow, error: memberError } = await supabaseAdmin
    .from("program_members")
    .select("id, role")
    .eq("program_id", programId)
    .eq("user_id", authUser.id)
    .maybeSingle();

  if (memberError) {
    console.error(
      "[/api/programs/[programId]/teams/[teamId]/seasons] program_members lookup error:",
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

function parsePathParams(urlStr: string): { programId?: string; teamId?: string } {
  try {
    const url = new URL(urlStr);
    const segments = url.pathname.split("/").filter(Boolean);
    // ["api", "programs", "<programId>", "teams", "<teamId>", "seasons"]
    const programsIndex = segments.indexOf("programs");
    const teamsIndex = segments.indexOf("teams");
    if (
      programsIndex !== -1 &&
      programsIndex + 1 < segments.length &&
      teamsIndex !== -1 &&
      teamsIndex + 1 < segments.length
    ) {
      return {
        programId: segments[programsIndex + 1],
        teamId: segments[teamsIndex + 1],
      };
    }
  } catch {
    // ignore
  }
  return {};
}

type TeamSeason = {
  id: string;
  team_id: string;
  program_id: string;
  academic_year: string;
  year_start: number;
  year_end: number | null;
  season_label: string;
  is_current: boolean;
  created_at: string | null;
};

type CreateSeasonBody = {
  academicYear: string;
  yearStart: number;
  yearEnd?: number | null;
  seasonLabel: string;
  isCurrent?: boolean;
};

// GET /api/programs/:programId/teams/:teamId/seasons → list seasons for this team
export async function GET(req: NextRequest) {
  const { programId, teamId } = parsePathParams(req.url);

  if (!programId || !teamId) {
    return NextResponse.json(
      { error: "Missing programId or teamId in path" },
      { status: 400 },
    );
  }

  const authCheck = await assertProgramMembership(req, programId);
  if (!authCheck.ok) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.status },
    );
  }

  try {
    const { data: seasons, error } = await supabaseAdmin
      .from("team_seasons")
      .select(
        "id, team_id, program_id, academic_year, year_start, year_end, season_label, is_current, created_at",
      )
      .eq("program_id", programId)
      .eq("team_id", teamId)
      .order("year_start", { ascending: false })
      .order("season_label", { ascending: true });

    if (error) {
      console.error(
        "[/api/programs/[programId]/teams/[teamId]/seasons] select error:",
        error,
      );
      return NextResponse.json(
        { error: "Failed to load team seasons" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        programId,
        teamId,
        seasons: seasons ?? [],
      },
      { status: 200 },
    );
  } catch (err) {
    console.error(
      "[/api/programs/[programId]/teams/[teamId]/seasons] Unexpected GET error:",
      err,
    );
    return NextResponse.json(
      { error: "Unexpected error loading team seasons" },
      { status: 500 },
    );
  }
}

// POST /api/programs/:programId/teams/:teamId/seasons → create a season for this team
export async function POST(req: NextRequest) {
  const { programId, teamId } = parsePathParams(req.url);

  if (!programId || !teamId) {
    return NextResponse.json(
      { error: "Missing programId or teamId in path" },
      { status: 400 },
    );
  }

  const authCheck = await assertProgramMembership(req, programId);
  if (!authCheck.ok) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.status },
    );
  }

  let body: CreateSeasonBody;
  try {
    body = (await req.json()) as CreateSeasonBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const academicYear = (body.academicYear || "").trim();
  const seasonLabel = (body.seasonLabel || "").trim();
  const yearStart = Number(body.yearStart);

  if (!academicYear || !seasonLabel || !yearStart) {
    return NextResponse.json(
      {
        error:
          "academicYear, seasonLabel, and yearStart are required to create a team season",
      },
      { status: 400 },
    );
  }

  const yearEnd =
    body.yearEnd !== undefined && body.yearEnd !== null
      ? Number(body.yearEnd)
      : null;

  try {
    const { data: newSeason, error } = await supabaseAdmin
      .from("team_seasons")
      .insert({
        team_id: teamId,
        program_id: programId,
        academic_year: academicYear,
        year_start: yearStart,
        year_end: yearEnd,
        season_label: seasonLabel,
        is_current: body.isCurrent ?? false,
      })
      .select(
        "id, team_id, program_id, academic_year, year_start, year_end, season_label, is_current, created_at",
      )
      .single();

    if (error) {
      console.error(
        "[/api/programs/[programId]/teams/[teamId]/seasons] insert error:",
        error,
      );
      return NextResponse.json(
        { error: "Failed to create team season" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        programId,
        teamId,
        season: newSeason,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error(
      "[/api/programs/[programId]/teams/[teamId]/seasons] Unexpected POST error:",
      err,
    );
    return NextResponse.json(
      { error: "Unexpected error creating team season" },
      { status: 500 },
    );
  }
}
