// app/api/programs/[programId]/teams/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Helper: ensure the current auth user belongs to this program.
// This mirrors the pattern used in /api/programs/[programId]/staff but
// correctly resolves auth user -> users.id -> program_members.user_id.
async function assertProgramMembership(req: NextRequest, programId: string) {
  const { supabase } = supabaseServer(req);

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn("[/api/programs/[programId]/teams] auth error:", authError);
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
      "[/api/programs/[programId]/teams] users lookup error:",
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
      "[/api/programs/[programId]/teams] program_members lookup error:",
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

  // In the future we can enforce specific roles (head_coach only, etc.)
  return { ok: true as const, status: 200 as const, error: null };
}

// GET /api/programs/:programId/teams → list teams/divisions for that program
export async function GET(req: NextRequest) {
  let programId: string | undefined;

  try {
    const url = new URL(req.url);
    const segments = url.pathname.split("/").filter(Boolean);
    // segments = ["api", "programs", "<programId>", "teams"]
    const programsIndex = segments.indexOf("programs");
    if (programsIndex !== -1 && segments.length > programsIndex + 1) {
      programId = segments[programsIndex + 1];
    }
  } catch {
    // ignore; we'll handle missing programId below
  }

  if (!programId) {
    return NextResponse.json(
      { error: "Missing programId in path" },
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
    const { data: teams, error } = await supabaseAdmin
      .from("teams")
      .select(
        "id, program_id, name, code, sport, gender, level, season, is_primary, created_at",
      )
      .eq("program_id", programId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(
        "[/api/programs/[programId]/teams] teams select error:",
        error,
      );
      return NextResponse.json(
        { error: "Failed to load teams" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        programId,
        teams: teams ?? [],
      },
      { status: 200 },
    );
  } catch (err) {
    console.error(
      "[/api/programs/[programId]/teams] Unexpected GET error:",
      err,
    );
    return NextResponse.json(
      { error: "Unexpected error loading teams" },
      { status: 500 },
    );
  }
}

type CreateTeamBody = {
  name: string;
  code?: string | null;
  sport?: string | null;
  gender?: string | null;
  level?: string | null;
  season?: string | null;
  isPrimary?: boolean;
};

// POST /api/programs/:programId/teams → create a new team/division in the program
export async function POST(req: NextRequest) {
  let programId: string | undefined;

  try {
    const url = new URL(req.url);
    const segments = url.pathname.split("/").filter(Boolean);
    const programsIndex = segments.indexOf("programs");
    if (programsIndex !== -1 && segments.length > programsIndex + 1) {
      programId = segments[programsIndex + 1];
    }
  } catch {
    // ignore; we'll handle missing programId below
  }

  if (!programId) {
    return NextResponse.json(
      { error: "Missing programId in path" },
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

  let body: CreateTeamBody;
  try {
    body = (await req.json()) as CreateTeamBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const name = (body.name || "").trim();

  if (!name) {
    return NextResponse.json(
      { error: "Team name is required" },
      { status: 400 },
    );
  }

  try {
    const { data: newTeam, error } = await supabaseAdmin
      .from("teams")
      .insert({
        program_id: programId,
        name,
        code: body.code ?? null,
        sport: body.sport ?? null,
        gender: body.gender ?? null,
        level: body.level ?? null,
        season: body.season ?? null,
        is_primary: body.isPrimary ?? false,
      })
      .select(
        "id, program_id, name, code, sport, gender, level, season, is_primary, created_at",
      )
      .single();

    if (error) {
      console.error(
        "[/api/programs/[programId]/teams] teams insert error:",
        error,
      );
      return NextResponse.json(
        { error: "Failed to create team" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        programId,
        team: newTeam,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error(
      "[/api/programs/[programId]/teams] Unexpected POST error:",
      err,
    );
    return NextResponse.json(
      { error: "Unexpected error creating team" },
      { status: 500 },
    );
  }
}
