// app/api/programs/[programId]/teams/[teamId]/seasons/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MANAGER_ROLES = ["head_coach", "director", "admin"] as const;

type ManagerRole = (typeof MANAGER_ROLES)[number];

function parseIdsFromUrl(url: string): { programId: string | null; teamId: string | null } {
  const { pathname } = new URL(url);
  const parts = pathname.split("/").filter(Boolean);
  // ["api", "programs", programId, "teams", teamId, "seasons"]
  const pIdx = parts.indexOf("programs");
  const tIdx = parts.indexOf("teams");
  const programId = pIdx !== -1 ? parts[pIdx + 1] ?? null : null;
  const teamId = tIdx !== -1 ? parts[tIdx + 1] ?? null : null;
  return { programId, teamId };
}

async function assertProgramMembership(
  req: NextRequest,
  programId: string,
  opts?: { requireManager?: boolean },
): Promise<
  | { ok: true; viewerUserId: string; role: string | null }
  | { ok: false; status: number; error: string }
> {
  const { supabase } = await supabaseServer(req);
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn("[TeamSeasons] auth.getUser error:", authError.message);
  }

  let authId: string | null = authUser?.id ?? null;

  if (!authId && bearerToken) {
    const { data: tokenUserData, error: tokenUserError } = await supabaseAdmin.auth.getUser(bearerToken);
    if (tokenUserError) {
      console.warn(
        "[TeamSeasons] bearer auth error:",
        tokenUserError.message,
      );
    } else {
      authId = tokenUserData?.user?.id ?? null;
    }
  }

  if (!authId) {
    return { ok: false, status: 401, error: "Not authenticated" };
  }

  const { data: userRow, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, auth_id")
    .eq("auth_id", authId)
    .maybeSingle();

  if (userError) {
    console.error("[TeamSeasons] users select error:", userError);
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

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from("program_members")
    .select("id, role")
    .eq("program_id", programId)
    .eq("user_id", viewerUserId)
    .maybeSingle();

  if (membershipError) {
    console.error("[TeamSeasons] membership error:", membershipError);
    return {
      ok: false,
      status: 500,
      error: "Failed to verify program membership",
    };
  }

  if (!membership) {
    return {
      ok: false,
      status: 403,
      error: "You are not a member of this program",
    };
  }

  const role = (membership.role as string | null) ?? null;

  if (opts?.requireManager) {
    if (!role || !MANAGER_ROLES.includes(role.toLowerCase() as ManagerRole)) {
      return {
        ok: false,
        status: 403,
        error: "You do not have permission to manage this team",
      };
    }
  }

  return { ok: true, viewerUserId, role };
}

// GET: seasons for this team
export async function GET(req: NextRequest) {
  const { programId, teamId } = parseIdsFromUrl(req.url);

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

  const { data: seasons, error } = await supabaseAdmin
    .from("team_seasons")
    .select(
      `
      id,
      team_id,
      program_id,
      academic_year,
      year_start,
      year_end,
      season_label,
      season_year,
      start_date,
      end_date,
      is_current,
      is_active,
      created_at
    `,
    )
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[TeamSeasons] select error:", error);
    return NextResponse.json(
      { error: "Failed to load team seasons" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { programId, teamId, seasons: seasons ?? [] },
    { status: 200 },
  );
}

// POST: create a season for this team (manager only)
export async function POST(req: NextRequest) {
  const { programId, teamId } = parseIdsFromUrl(req.url);

  if (!programId || !teamId) {
    return NextResponse.json(
      { error: "Missing programId or teamId in path" },
      { status: 400 },
    );
  }

  const authCheck = await assertProgramMembership(req, programId, {
    requireManager: true,
  });

  if (!authCheck.ok) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.status },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const seasonLabel = (body?.seasonLabel ?? body?.season_label) as string | undefined;
  const academicYear = (body?.academicYear ?? body?.academic_year) as string | undefined;
  const yearStartRaw = body?.yearStart ?? body?.year_start;
  const yearEndRaw = body?.yearEnd ?? body?.year_end;
  const seasonYearRaw = body?.seasonYear ?? body?.season_year;

  const season_label = seasonLabel?.trim();
  const academic_year = academicYear?.trim();

  const year_start = typeof yearStartRaw === "number" ? yearStartRaw : parseInt(String(yearStartRaw ?? ""), 10);
  const year_end = yearEndRaw === null || yearEndRaw === undefined || yearEndRaw === ""
    ? null
    : (typeof yearEndRaw === "number" ? yearEndRaw : parseInt(String(yearEndRaw), 10));

  const season_year = seasonYearRaw === null || seasonYearRaw === undefined || seasonYearRaw === ""
    ? null
    : (typeof seasonYearRaw === "number" ? seasonYearRaw : parseInt(String(seasonYearRaw), 10));

  const start_date = (body?.startDate ?? body?.start_date) as string | null | undefined;
  const end_date = (body?.endDate ?? body?.end_date) as string | null | undefined;

  const isCurrent = Boolean(body?.isCurrent ?? body?.is_current);

  if (!season_label || !academic_year || !Number.isFinite(year_start)) {
    return NextResponse.json(
      { error: "academic_year, year_start, and season_label are required" },
      { status: 400 },
    );
  }

  // Duplicate protection: same team_id + academic_year + season_label
  const { data: existingSeason, error: existingSeasonError } = await supabaseAdmin
    .from("team_seasons")
    .select(
      `
      id,
      team_id,
      program_id,
      academic_year,
      year_start,
      year_end,
      season_label,
      season_year,
      start_date,
      end_date,
      is_current,
      is_active,
      created_at
    `,
    )
    .eq("team_id", teamId)
    .eq("academic_year", academic_year)
    .eq("season_label", season_label)
    .maybeSingle();

  if (existingSeasonError) {
    console.error("[TeamSeasons] duplicate check error:", existingSeasonError);
    return NextResponse.json(
      { error: "Failed to check existing team seasons" },
      { status: 500 },
    );
  }

  if (existingSeason) {
    // If requested current, promote and demote others.
    if (isCurrent && !existingSeason.is_current) {
      const { error: demoteError } = await supabaseAdmin
        .from("team_seasons")
        .update({ is_current: false })
        .eq("team_id", teamId);

      if (demoteError) {
        console.error("[TeamSeasons] demote current error:", demoteError);
        return NextResponse.json(
          { error: "Failed to update current season" },
          { status: 500 },
        );
      }

      const { data: promoted, error: promoteError } = await supabaseAdmin
        .from("team_seasons")
        .update({ is_current: true })
        .eq("id", existingSeason.id)
        .select(
          `
          id,
          team_id,
          program_id,
          academic_year,
          year_start,
          year_end,
          season_label,
          season_year,
          start_date,
          end_date,
          is_current,
          is_active,
          created_at
        `,
        )
        .single();

      if (promoteError) {
        console.error("[TeamSeasons] promote current error:", promoteError);
        return NextResponse.json(
          { error: "Failed to update current season" },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { ok: true, existing: true, season: promoted },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { ok: true, existing: true, season: existingSeason },
      { status: 200 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from("team_seasons")
    .insert({
      team_id: teamId,
      program_id: programId,
      academic_year,
      year_start,
      year_end,
      season_label,
      season_year,
      start_date: start_date ?? null,
      end_date: end_date ?? null,
      is_current: isCurrent,
    })
    .select(
      `
      id,
      team_id,
      program_id,
      academic_year,
      year_start,
      year_end,
      season_label,
      season_year,
      start_date,
      end_date,
      is_current,
      is_active,
      created_at
    `,
    )
    .single();

  if (error) {
    console.error("[TeamSeasons] insert error:", error);
    return NextResponse.json(
      { error: "Failed to create team season" },
      { status: 500 },
    );
  }

  if (isCurrent) {
    const { error: demoteError } = await supabaseAdmin
      .from("team_seasons")
      .update({ is_current: false })
      .eq("team_id", teamId)
      .neq("id", data.id);

    if (demoteError) {
      console.error("[TeamSeasons] demote current error:", demoteError);
      return NextResponse.json(
        { error: "Season created, but failed to update current season" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true, existing: false, season: data }, { status: 201 });
}