// app/api/programs/[programId]/teams/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MANAGER_ROLES = ["head_coach", "director", "admin"] as const;

type ManagerRole = (typeof MANAGER_ROLES)[number];

function parseProgramIdFromUrl(url: string): string | null {
  const { pathname } = new URL(url);
  const parts = pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("programs");
  if (idx === -1 || idx + 1 >= parts.length) return null;
  return parts[idx + 1] || null;
}

// Ensure the current auth user belongs to this program.
// Optionally require a manager-level role.
async function assertProgramMembership(
  req: NextRequest,
  programId: string,
  opts?: { requireManager?: boolean }
): Promise<
  | { ok: true; viewerUserId: string; role: string | null }
  | { ok: false; status: number; error: string }
> {
  const { supabase } = supabaseServer(req);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn(
      "[/api/programs/[programId]/teams] auth.getUser error:",
      authError.message
    );
  }

  let authId: string | null = authUser?.id ?? null;

  if (!authId && bearerToken) {
    const { data: tokenUserData, error: tokenUserError } = await supabaseAdmin.auth.getUser(bearerToken);
    if (tokenUserError) {
      console.warn(
        "[/api/programs/[programId]/teams] bearer auth error:",
        tokenUserError.message,
      );
    } else {
      authId = tokenUserData?.user?.id ?? null;
    }
  }

  if (!authId) {
    return { ok: false, status: 401, error: "Not authenticated" };
  }

  // Map auth user -> public.users row
  const { data: userRow, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, auth_id, email")
    .eq("auth_id", authId)
    .maybeSingle();

  if (userError) {
    console.error(
      "[/api/programs/[programId]/teams] users select error:",
      userError
    );
    return {
      ok: false,
      status: 500,
      error: "Failed to load viewer user record",
    };
  }

  if (!userRow) {
    return {
      ok: false,
      status: 403,
      error: "User record not found for this account",
    };
  }

  const viewerUserId = userRow.id as string;

  // Check membership in this program
  const { data: membershipRow, error: membershipError } = await supabaseAdmin
    .from("program_members")
    .select("id, role, program_id")
    .eq("program_id", programId)
    .eq("user_id", viewerUserId)
    .maybeSingle();

  if (membershipError) {
    console.error(
      "[/api/programs/[programId]/teams] membership select error:",
      membershipError
    );
    return {
      ok: false,
      status: 500,
      error: "Failed to load membership for this program",
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

  if (opts?.requireManager) {
    if (
      !role ||
      !MANAGER_ROLES.includes(role.toLowerCase() as ManagerRole)
    ) {
      return {
        ok: false,
        status: 403,
        error: "You do not have permission to manage teams for this program",
      };
    }
  }

  return { ok: true, viewerUserId, role };
}

// GET: list teams for a program
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

  try {
    const { data: teams, error } = await supabaseAdmin
      .from("teams")
      .select(
        `
        id,
        program_id,
        name,
        code,
        sport,
        gender,
        level,
        season,
        is_primary
      `
      )
      .eq("program_id", programId)
      .order("name", { ascending: true });

    if (error) {
      console.error(
        "[/api/programs/[programId]/teams] teams select error:",
        error
      );
      return NextResponse.json(
        { error: "Failed to load teams" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        programId,
        teams: teams ?? [],
      },
      { status: 200 }
    );
  } catch (err) {
    console.error(
      "[/api/programs/[programId]/teams] Unexpected GET error:",
      err
    );
    return NextResponse.json(
      { error: "Unexpected error loading teams" },
      { status: 500 }
    );
  }
}

// POST: create a team for this program (manager-only)
export async function POST(req: NextRequest) {
  const programId = parseProgramIdFromUrl(req.url);

  if (!programId) {
    return NextResponse.json(
      { error: "Missing programId in path" },
      { status: 400 }
    );
  }

  const authCheck = await assertProgramMembership(req, programId, {
    requireManager: true,
  });

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

  const name = (body?.name as string | undefined)?.trim();
  const code = (body?.code as string | undefined)?.trim() || null;
  const sport = (body?.sport as string | undefined)?.trim() || null;
  const gender = (body?.gender as string | undefined)?.trim() || null;
  const level = (body?.level as string | undefined)?.trim() || null;
  const season = (body?.season as string | undefined)?.trim() || null;
  const isPrimary = Boolean(body?.isPrimary);

  if (!name) {
    return NextResponse.json(
      { error: "Team name is required" },
      { status: 400 }
    );
  }

  try {
    // Duplicate protection: same program_id + name + sport + gender + level + season
    let teamQuery = supabaseAdmin
      .from("teams")
      .select("id, program_id, name, code, sport, gender, level, season, is_primary")
      .eq("program_id", programId)
      .eq("name", name);

    if (sport === null) teamQuery = teamQuery.is("sport", null);
    else teamQuery = teamQuery.eq("sport", sport);

    if (gender === null) teamQuery = teamQuery.is("gender", null);
    else teamQuery = teamQuery.eq("gender", gender);

    if (level === null) teamQuery = teamQuery.is("level", null);
    else teamQuery = teamQuery.eq("level", level);

    if (season === null) teamQuery = teamQuery.is("season", null);
    else teamQuery = teamQuery.eq("season", season);

    const { data: existingTeam, error: existingTeamError } = await teamQuery.maybeSingle();

    if (existingTeamError) {
      console.error(
        "[/api/programs/[programId]/teams] teams duplicate check error:",
        existingTeamError,
      );
      return NextResponse.json(
        { error: "Failed to check existing teams" },
        { status: 500 },
      );
    }

    if (existingTeam) {
      // If requested primary, promote this team and demote others.
      if (isPrimary && !existingTeam.is_primary) {
        const { error: demoteError } = await supabaseAdmin
          .from("teams")
          .update({ is_primary: false })
          .eq("program_id", programId);

        if (demoteError) {
          console.error(
            "[/api/programs/[programId]/teams] teams demote error:",
            demoteError,
          );
          return NextResponse.json(
            { error: "Failed to update primary team" },
            { status: 500 },
          );
        }

        const { data: promotedTeam, error: promoteError } = await supabaseAdmin
          .from("teams")
          .update({ is_primary: true })
          .eq("id", existingTeam.id)
          .select(
            `
            id,
            program_id,
            name,
            code,
            sport,
            gender,
            level,
            season,
            is_primary
          `,
          )
          .single();

        if (promoteError) {
          console.error(
            "[/api/programs/[programId]/teams] teams promote error:",
            promoteError,
          );
          return NextResponse.json(
            { error: "Failed to update primary team" },
            { status: 500 },
          );
        }

        return NextResponse.json(
          { ok: true, existing: true, team: promotedTeam },
          { status: 200 },
        );
      }

      return NextResponse.json(
        { ok: true, existing: true, team: existingTeam },
        { status: 200 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("teams")
      .insert({
        program_id: programId,
        name,
        code,
        sport,
        gender,
        level,
        season,
        is_primary: isPrimary,
      })
      .select(
        `
        id,
        program_id,
        name,
        code,
        sport,
        gender,
        level,
        season,
        is_primary
      `
      )
      .single();

    if (error) {
      console.error(
        "[/api/programs/[programId]/teams] teams insert error:",
        error
      );
      return NextResponse.json(
        { error: "Failed to create team" },
        { status: 500 }
      );
    }

    if (isPrimary) {
      const { error: demoteError } = await supabaseAdmin
        .from("teams")
        .update({ is_primary: false })
        .eq("program_id", programId)
        .neq("id", data.id);

      if (demoteError) {
        console.error(
          "[/api/programs/[programId]/teams] teams demote error:",
          demoteError,
        );
        return NextResponse.json(
          { error: "Team created, but failed to update primary team" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      { ok: true, existing: false, team: data },
      { status: 201 }
    );
  } catch (err) {
    console.error(
      "[/api/programs/[programId]/teams] Unexpected POST error:",
      err
    );
    return NextResponse.json(
      { error: "Unexpected error creating team" },
      { status: 500 }
    );
  }
}