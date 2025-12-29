// app/api/programs/[programId]/team-seasons/[teamSeasonId]/roster/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type Ctx = { params: Promise<Record<string, string>> };

async function getProgramMemberOrError(req: NextRequest, programId: string) {
  const { supabase } = supabaseServer(req);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: programMember, error: pmError } = await supabase
    .from("program_members")
    .select("id, program_id")
    .eq("user_id", user.id)
    .eq("program_id", programId)
    .maybeSingle();

  if (pmError || !programMember) {
    return {
      supabase,
      errorResponse: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { supabase, errorResponse: null };
}

// GET: team season roster for assigning to practice groups
export async function GET(req: NextRequest, { params }: Ctx) {
  const { programId, teamSeasonId } = await params;

  const { supabase, errorResponse } = await getProgramMemberOrError(req, programId);
  if (errorResponse) return errorResponse;

  // Join team_roster → athletes to get names & metadata
  const { data, error } = await supabase
    .from("team_roster")
    .select(
      `
      id,
      athlete_id,
      team_season_id,
      event_group,
      status,
      athletes:athlete_id (
        first_name,
        last_name,
        grad_year
      )
    `
    )
    .eq("team_season_id", teamSeasonId)
    .eq("program_id", programId)
    .order("last_name", { referencedTable: "athletes", ascending: true });

  if (error) {
    console.error("[GET team-season roster] error", error);
    return NextResponse.json(
      { error: "Failed to load team roster" },
      { status: 500 }
    );
  }

  const roster = (data ?? []).map((row: any) => {
    const athletesArray =
      (row.athletes as
        | { first_name: string; last_name: string; grad_year: number | null }[]
        | null
        | undefined) ?? null;

    const athlete =
      Array.isArray(athletesArray) && athletesArray.length > 0
        ? athletesArray[0]
        : null;

    return {
      id: row.id as string, // team_roster.id
      athlete_id: row.athlete_id as string,
      first_name: athlete?.first_name ?? "Unknown",
      last_name: athlete?.last_name ?? "Athlete",
      event_group: (row.event_group as string | null) ?? null,
      class_year: athlete?.grad_year ? String(athlete.grad_year) : null,
    };
  });

  return NextResponse.json({ roster }, { status: 200 });
}