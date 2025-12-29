// app/(system)/api/programs/[programId]/athletes/route.ts
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
  const { supabase } = await supabaseServer(req);

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

  // Filters
  const relationshipType = searchParams.get(
    "relationshipType",
  ) as RelationshipType | null;
  const status = searchParams.get("status")?.trim() || null;
  const eventGroup = searchParams.get("eventGroup")?.trim() || null;
  const gradYear = searchParams.get("gradYear")?.trim() || null;

  // Search
  const q = searchParams.get("q")?.trim() || null;

  // Options
  const include = (searchParams.get("include") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const includeScore = include.includes("score");

  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") || "50", 10), 1),
    200,
  );
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

  try {
    // Base select: always include athlete fields so UI never has to “guess” how to join
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
        archived_at,
        athlete:athletes!inner(
          id,
          first_name,
          last_name,
          grad_year,
          event_group,
          avatar_url,
          gender,
          hs_school_name,
          hs_city,
          hs_state,
          hs_country,
          is_claimed
        )
      `,
      )
      .eq("program_id", programId)
      .is("archived_at", null)
      .not("athlete_id", "is", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (relationshipType) {
      query = query.eq("relationship_type", relationshipType);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (eventGroup) {
      query = query.eq("athlete.event_group", eventGroup);
    }

    if (gradYear) {
      const gy = parseInt(gradYear, 10);
      if (!Number.isNaN(gy)) {
        query = query.eq("athlete.grad_year", gy);
      }
    }

    if (q) {
      // Name search on joined athletes table
      query = query.or(
        `first_name.ilike.%${q}%,last_name.ilike.%${q}%`,
        { foreignTable: "athletes" },
      );
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

    const rows = (data as any[]) ?? [];

    // Shape normalization
    const athletes = rows
      .filter((row) => row?.athlete)
      .map((row) => ({
        programAthleteId: row.id as string,
        programId: row.program_id as string,
        athleteId: row.athlete_id as string,
        relationshipType: row.relationship_type as RelationshipType,
        status: (row.status ?? null) as ProgramAthleteStatus,
        level: (row.level ?? null) as string | null,
        source: (row.source ?? null) as string | null,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string,
        archivedAt: (row.archived_at ?? null) as string | null,
        athlete: {
          id: row.athlete.id as string,
          firstName: row.athlete.first_name as string,
          lastName: row.athlete.last_name as string,
          gradYear: row.athlete.grad_year as number,
          eventGroup: (row.athlete.event_group ?? null) as string | null,
          avatarUrl: (row.athlete.avatar_url ?? null) as string | null,
          gender: (row.athlete.gender ?? null) as string | null,
          hsSchoolName: (row.athlete.hs_school_name ?? null) as string | null,
          hsCity: (row.athlete.hs_city ?? null) as string | null,
          hsState: (row.athlete.hs_state ?? null) as string | null,
          hsCountry: (row.athlete.hs_country ?? null) as string | null,
          isClaimed: !!row.athlete.is_claimed,
        },
        score: null as null | {
          globalOverall: number;
          academicScore: number;
          performanceScore: number;
          availabilityScore: number;
          conductScore: number;
          coachableScore: number;
        },
      }));

    // Optional: include athlete_scores in list payload (one extra query, deterministic mapping)
    if (includeScore && athletes.length > 0) {
      const athleteIds = athletes.map((a) => a.athleteId);

      const { data: scoreRows, error: scoreError } = await supabaseAdmin
        .from("athlete_scores")
        .select(
          "athlete_id, global_overall, academic_score, performance_score, availability_score, conduct_score, coachable_score",
        )
        .in("athlete_id", athleteIds);

      if (scoreError) {
        console.error(
          "[/api/programs/[programId]/athletes] athlete_scores select error:",
          scoreError,
        );
        // Do not fail the entire request — return list without scores.
      } else {
        const scoreByAthleteId = new Map<string, any>();
        for (const s of (scoreRows as any[]) ?? []) {
          scoreByAthleteId.set(s.athlete_id, s);
        }
        for (const a of athletes) {
          const s = scoreByAthleteId.get(a.athleteId);
          if (s) {
            a.score = {
              globalOverall: Number(s.global_overall ?? 0),
              academicScore: Number(s.academic_score ?? 0),
              performanceScore: Number(s.performance_score ?? 0),
              availabilityScore: Number(s.availability_score ?? 0),
              conductScore: Number(s.conduct_score ?? 0),
              coachableScore: Number(s.coachable_score ?? 0),
            };
          }
        }
      }
    }

    return NextResponse.json(
      {
        programId,
        athletes,
        meta: {
          limit,
          offset,
          returned: athletes.length,
        },
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
