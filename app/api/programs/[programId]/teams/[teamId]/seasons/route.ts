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
  const { supabase } = supabaseServer(req);

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn("[TeamSeasons] auth.getUser error:", authError.message);
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
      season_label,
      season_year,
      start_date,
      end_date,
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

  const season_label = (body?.season_label as string | undefined)?.trim();
  const season_year =
    typeof body?.season_year === "number" ? body.season_year : null;
  const start_date = (body?.start_date as string | undefined) || null;
  const end_date = (body?.end_date as string | undefined) || null;

  if (!season_label) {
    return NextResponse.json(
      { error: "Season label is required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from("team_seasons")
    .insert({
      team_id: teamId,
      season_label,
      season_year,
      start_date,
      end_date,
    })
    .select(
      `
      id,
      team_id,
      season_label,
      season_year,
      start_date,
      end_date,
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

  return NextResponse.json({ ok: true, season: data }, { status: 201 });
}