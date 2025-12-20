// app/api/programs/[programId]/athletes/route.ts
// Program-level athletes endpoint: list and attach athletes to a program.
// This is the backbone for the recruiting board & roster views at the program level.

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RelationshipType =
  | "recruit"
  | "watchlist"
  | "walk_on"
  | "roster"
  | "alumni"
  | "owned";

type ProgramAthleteStatus = string | null; // future: narrow this per relationship

type ProgramAthlete = {
  id: string;
  program_id: string;
  athlete_id: string;
  level: string | null;
  relationship_type: RelationshipType;
  status: ProgramAthleteStatus;
  source: string | null;
  created_by_program_member_id: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

// Shared auth helper
async function assertProgramMembership(req: NextRequest, programId: string) {
  const { supabase } = supabaseServer(req);

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn(
      "[/api/programs/[programId]/athletes] auth error:",
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

  const { data: userRow, error: userError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("auth_id", authUser.id)
    .maybeSingle();

  if (userError) {
    console.error(
      "[/api/programs/[programId]/athletes] users lookup error:",
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

  const { data: memberRow, error: memberError } = await supabaseAdmin
    .from("program_members")
    .select("id, role")
    .eq("program_id", programId)
    .eq("user_id", userId)
    .maybeSingle();

  if (memberError) {
    console.error(
      "[/api/programs/[programId]/athletes] program_members lookup error:",
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

  return {
    ok: true as const,
    status: 200 as const,
    error: null,
    memberId: memberRow.id as string,
  };
}

// GET /api/programs/:programId/athletes
// List all program_athletes for this program, with optional filtering
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ programId: string }> },
) {
  const { programId } = await context.params;

  const authCheck = await assertProgramMembership(req, programId);
  if (!authCheck.ok) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.status },
    );
  }

  const { searchParams } = new URL(req.url);
  const relationshipType = searchParams.get(
    "relationshipType",
  ) as RelationshipType | null;
  const status = searchParams.get("status") ?? null;
  const q = searchParams.get("q")?.trim() || null;

  try {
    // SEARCH MODE (used by Scenario Add modal)
    if (q) {
      const { data, error } = await supabaseAdmin
        .from("program_athletes")
        .select(
          `
          id,
          athlete_id,
          relationship_type,
          status,
          athlete:athletes!inner(
            id,
            first_name,
            last_name,
            grad_year,
            event_group
          )
        `
        )
        .eq("program_id", programId)
        .is("archived_at", null)
        .not("athlete_id", "is", null)
        .or(
          `first_name.ilike.%${q}%,last_name.ilike.%${q}%`, { foreignTable: "athletes" }
        )
        .order("created_at", { ascending: false })
        .limit(25);

      if (error) {
        console.error(
          "[/api/programs/[programId]/athletes] search error:",
          error,
        );
        return NextResponse.json(
          { error: "Failed to search program athletes" },
          { status: 500 },
        );
      }

      const results = (data || []).filter((row: any) => row?.athlete).map((row: any) => ({
        id: row.athlete.id,
        programAthleteId: row.id,
        first_name: row.athlete.first_name,
        last_name: row.athlete.last_name,
        grad_year: row.athlete.grad_year,
        event_group: row.athlete.event_group ?? null,
        relationship_type: row.relationship_type,
        status: row.status,
      }));

      return NextResponse.json(
        { programId, athletes: results },
        { status: 200 },
      );
    }

    // DEFAULT LIST MODE (existing behavior)
    let query = supabaseAdmin
      .from("program_athletes")
      .select(
        `
        id,
        program_id,
        athlete_id,
        level,
        relationship_type,
        status,
        source,
        created_by_program_member_id,
        created_at,
        updated_at,
        archived_at
      `,
      )
      .eq("program_id", programId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (relationshipType) {
      query = query.eq("relationship_type", relationshipType);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error(
        "[/api/programs/[programId]/athletes] select error:",
        error,
      );
      return NextResponse.json(
        { error: "Failed to load program athletes" },
        { status: 500 },
      );
    }

    const results: ProgramAthlete[] = (data as any[]) ?? [];

    return NextResponse.json(
      {
        programId,
        athletes: results,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error(
      "[/api/programs/[programId]/athletes] unexpected GET error:",
      err,
    );
    return NextResponse.json(
      { error: "Unexpected error loading program athletes" },
      { status: 500 },
    );
  }
}

type AttachAthleteBody = {
  athleteId: string;
  relationshipType?: RelationshipType;
  status?: ProgramAthleteStatus;
  source?: string | null;
};

// POST /api/programs/:programId/athletes
// Attach an existing athlete (UAI) to this program as recruit/roster/etc.
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ programId: string }> },
) {
  const { programId } = await context.params;

  const authCheck = await assertProgramMembership(req, programId);
  if (!authCheck.ok) {
    return NextResponse.json(
      { error: authCheck.error },
      { status: authCheck.status },
    );
  }

  let body: AttachAthleteBody;
  try {
    body = (await req.json()) as AttachAthleteBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const athleteId = (body.athleteId || "").trim();
  if (!athleteId) {
    return NextResponse.json(
      { error: "athleteId is required" },
      { status: 400 },
    );
  }

  // Minimal validation of relationshipType
  const relationshipType: RelationshipType =
    (body.relationshipType as RelationshipType) || "recruit";

  try {
    // Verify athlete exists
    const { data: athleteRow, error: athleteError } = await supabaseAdmin
      .from("athletes")
      .select("id")
      .eq("id", athleteId)
      .maybeSingle();

    if (athleteError) {
      console.error(
        "[/api/programs/[programId]/athletes] athlete lookup error:",
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

    const { data: programRow, error: programError } = await supabaseAdmin
      .from("programs")
      .select("id, level")
      .eq("id", programId)
      .maybeSingle();

    if (programError) {
      console.error(
        "[/api/programs/[programId]/athletes] program lookup error:",
        programError,
      );
      return NextResponse.json(
        { error: "Failed to verify program" },
        { status: 500 },
      );
    }

    if (!programRow) {
      return NextResponse.json(
        { error: "Program not found" },
        { status: 404 },
      );
    }

    const level: string | null = (programRow as any).level ?? null;

    const { data: upserted, error } = await supabaseAdmin
      .from("program_athletes")
      .upsert(
        {
          program_id: programId,
          athlete_id: athleteId,
          level,
          relationship_type: relationshipType,
          status: body.status ?? null,
          source: body.source ?? null,
          created_by_program_member_id: authCheck.memberId,
        },
        {
          onConflict: "program_id,athlete_id",
        },
      )
      .select(
        `
        id,
        program_id,
        athlete_id,
        level,
        relationship_type,
        status,
        source,
        created_by_program_member_id,
        created_at,
        updated_at,
        archived_at
      `,
      )
      .single();

    if (error) {
      console.error(
        "[/api/programs/[programId]/athletes] upsert error:",
        error,
      );
      return NextResponse.json(
        { error: "Failed to attach athlete to program" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        programId,
        athlete: upserted as ProgramAthlete,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error(
      "[/api/programs/[programId]/athletes] unexpected POST error:",
      err,
    );
    return NextResponse.json(
      { error: "Unexpected error attaching athlete to program" },
      { status: 500 },
    );
  }
}
