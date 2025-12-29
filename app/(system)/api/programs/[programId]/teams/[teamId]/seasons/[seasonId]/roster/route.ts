// app/api/programs/[programId]/teams/[teamId]/seasons/[seasonId]/roster/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MANAGER_ROLES = ["head_coach", "director", "admin"] as const;

type ManagerRole = (typeof MANAGER_ROLES)[number];

function parseIdsFromUrl(url: string): {
  programId: string | null;
  teamId: string | null;
  seasonId: string | null;
} {
  const { pathname } = new URL(url);
  const parts = pathname.split("/").filter(Boolean);
  // ["api", "programs", programId, "teams", teamId, "seasons", seasonId, "roster"]
  const pIdx = parts.indexOf("programs");
  const tIdx = parts.indexOf("teams");
  const sIdx = parts.indexOf("seasons");
  const programId = pIdx !== -1 ? parts[pIdx + 1] ?? null : null;
  const teamId = tIdx !== -1 ? parts[tIdx + 1] ?? null : null;
  const seasonId = sIdx !== -1 ? parts[sIdx + 1] ?? null : null;
  return { programId, teamId, seasonId };
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

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { ok: false, status: 401, error: "Not authenticated" };
  }

  const authId = authUser.id;

  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id, auth_id")
    .eq("auth_id", authId)
    .maybeSingle();

  if (!userRow) {
    return {
      ok: false,
      status: 403,
      error: "User record not found for this account",
    };
  }

  const viewerUserId = userRow.id as string;

  const { data: membership } = await supabaseAdmin
    .from("program_members")
    .select("id, role")
    .eq("program_id", programId)
    .eq("user_id", viewerUserId)
    .maybeSingle();

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
        error: "You do not have permission to manage this roster",
      };
    }
  }

  return { ok: true, viewerUserId, role };
}

// GET: roster entries for this season
export async function GET(req: NextRequest) {
  const { programId, seasonId } = parseIdsFromUrl(req.url);

  if (!programId || !seasonId) {
    return NextResponse.json(
      { error: "Missing programId or seasonId in path" },
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

  const { data: rosterRows, error } = await supabaseAdmin
    .from("team_roster")
    .select(
      `
      id,
      team_season_id,
      athlete_id,
      status,
      role,
      created_at,
      athlete:athletes!inner (
        id,
        email,
        avatar_url
      )
    `,
    )
    .eq("team_season_id", seasonId);

  if (error) {
    console.error("[TeamRoster] select error:", error);
    return NextResponse.json(
      { error: "Failed to load roster" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      programId,
      seasonId,
      roster: rosterRows ?? [],
    },
    { status: 200 },
  );
}

// POST: add a recruit to this roster (manager only, via program_recruit_id)
export async function POST(req: NextRequest) {
  const { programId, seasonId } = parseIdsFromUrl(req.url);

  if (!programId || !seasonId) {
    return NextResponse.json(
      { error: "Missing programId or seasonId in path" },
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

  const program_recruit_id =
    (body?.program_recruit_id as string | undefined) ?? null;
  const status = (body?.status as string | undefined) ?? "active";
  const role = (body?.role as string | undefined) ?? null;

  if (!program_recruit_id) {
    return NextResponse.json(
      { error: "program_recruit_id is required" },
      { status: 400 }
    );
  }

  // 1) Resolve program_recruit -> recruiting_profile -> athlete
  const { data: prRow, error: prError } = await supabaseAdmin
    .from("program_recruits")
    .select(
      `
      id,
      program_id,
      status,
      source,
      recruiting_profile:recruiting_profiles!inner (
        id,
        athlete:athletes!inner (
          id
        )
      )
    `
    )
    .eq("id", program_recruit_id)
    .maybeSingle();

  if (prError) {
    console.error("[TeamRoster] program_recruits lookup error:", prError);
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

  // Check that this recruit belongs to this program
  if ((prRow.program_id as string) !== programId) {
    return NextResponse.json(
      { error: "Recruit does not belong to this program" },
      { status: 403 }
    );
  }

  const profileRel = (prRow as any).recruiting_profile;
  const profileRecord = Array.isArray(profileRel)
    ? profileRel[0]
    : profileRel;
  const athleteRel = profileRecord?.athlete;
  const athleteRecord = Array.isArray(athleteRel)
    ? athleteRel[0]
    : athleteRel;

  if (!athleteRecord) {
    return NextResponse.json(
      { error: "Recruiting profile missing athlete" },
      { status: 500 }
    );
  }

  const athlete_id = athleteRecord.id as string;

  // 2) Insert roster entry
  const { data, error } = await supabaseAdmin
    .from("team_roster")
    .insert({
      team_season_id: seasonId,
      athlete_id,
      program_recruit_id,
      status,
      role,
    })
    .select(
      `
      id,
      team_season_id,
      athlete_id,
      program_recruit_id,
      status,
      role,
      created_at
    `
    )
    .single();

  if (error) {
    console.error("[TeamRoster] insert error:", error);
    return NextResponse.json(
      { error: "Failed to add athlete to roster" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { ok: true, rosterEntry: data },
    { status: 201 }
  );
}