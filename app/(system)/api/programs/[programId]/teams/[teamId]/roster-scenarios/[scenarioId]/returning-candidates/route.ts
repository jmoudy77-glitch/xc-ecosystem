import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// This route returns "returning athlete" candidates for a scenario.
// Definition (initial version):
// - Athletes on the previous team season's roster
// - Excludes athletes already in this scenario
// - Excludes athletes explicitly marked not returning (program-level: program_athletes.status = 'not_returning')
//   (and also excludes team_roster.status = 'not_returning' for backward compatibility)
// - Excludes 5th-year athletes for the target season

export async function GET(req: NextRequest, ctx: { params: Promise<{ programId: string; teamId: string; scenarioId: string }> }) {
  const { programId, teamId, scenarioId } = await ctx.params;

  // Auth (viewer must at least belong to program)
  const { supabase } = supabaseServer(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Resolve internal user id
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!userRow) {
    return NextResponse.json({ error: "User record not found" }, { status: 403 });
  }

  // Ensure viewer is a member of this program
  const { data: memberRow, error: memberError } = await supabaseAdmin
    .from("program_members")
    .select("id")
    .eq("program_id", programId)
    .eq("user_id", userRow.id)
    .maybeSingle();

  if (memberError) {
    console.error("[returning-candidates] membership error", memberError);
    return NextResponse.json({ error: "Failed to verify membership" }, { status: 500 });
  }

  if (!memberRow) {
    return NextResponse.json({ error: "Not a member of this program" }, { status: 403 });
  }

  // Ensure scenario belongs to this program/team
  const { data: scenarioRow, error: scenarioError } = await supabaseAdmin
    .from("roster_scenarios")
    .select("id, program_id, team_id, target_season_year")
    .eq("id", scenarioId)
    .maybeSingle();

  if (scenarioError || !scenarioRow) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  if (scenarioRow.program_id !== programId || scenarioRow.team_id !== teamId) {
    return NextResponse.json({ error: "Scenario does not belong to this team/program" }, { status: 403 });
  }

  if (!scenarioRow.target_season_year) {
    return NextResponse.json({ athletes: [] });
  }

  // Find previous team season
  const { data: prevSeason } = await supabaseAdmin
    .from("team_seasons")
    .select("id, season_year")
    .eq("team_id", teamId)
    .eq("program_id", programId)
    .lt("season_year", scenarioRow.target_season_year)
    .order("season_year", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!prevSeason) {
    return NextResponse.json({ athletes: [] });
  }

  // Fetch athlete_ids already in this scenario
  const { data: existingEntries } = await supabaseAdmin
    .from("roster_scenario_entries")
    .select("athlete_id")
    .eq("scenario_id", scenarioId)
    .not("athlete_id", "is", null);

  const existingAthleteIds = new Set(
    (existingEntries ?? []).map((r) => r.athlete_id).filter(Boolean)
  );

  // Program-level non-returners (persistent housekeeping)
  // NOTE: This uses program_athletes.status = 'not_returning' as the current storage.
  // A dedicated boolean/reason field can be added later via migration.
  const { data: programNonReturners, error: nonReturnersError } = await supabaseAdmin
    .from("program_athletes")
    .select("athlete_id")
    .eq("program_id", programId)
    .eq("status", "not_returning");

  if (nonReturnersError) {
    console.error("[returning-candidates] program non-returners error", nonReturnersError);
    return NextResponse.json({ error: "Failed to load program non-returners" }, { status: 500 });
  }

  const programNonReturnerIds = new Set(
    (programNonReturners ?? []).map((r: any) => r.athlete_id).filter(Boolean)
  );

  // Fetch previous season roster + athlete identity
  const { data: rosterRows, error: rosterError } = await supabaseAdmin
    .from("team_roster")
    .select(
      `
        athlete_id,
        status,
        athletes!inner (
          id,
          first_name,
          last_name,
          grad_year,
          event_group
        )
      `
    )
    .eq("team_season_id", prevSeason.id)
    .eq("team_id", teamId)
    .eq("program_id", programId);

  if (rosterError) {
    console.error("[returning-candidates] roster error", rosterError);
    return NextResponse.json({ error: "Failed to load roster" }, { status: 500 });
  }

  const targetYear = scenarioRow.target_season_year as number | null;

  const athletes = (rosterRows ?? [])
    .filter((row: any) => {
      if (!row.athlete_id) return false;
      if (existingAthleteIds.has(row.athlete_id)) return false;

      // Exclude explicit non-returners (program-level) and legacy roster-level flag
      if (programNonReturnerIds.has(row.athlete_id)) return false;
      if (row.status === "not_returning") return false;

      // Exclude 5th-year athletes for target season
      if (targetYear && row.athletes?.grad_year) {
        const yearsPastGrad = targetYear - row.athletes.grad_year;
        if (yearsPastGrad >= 1) return false;
      }

      return true;
    })
    .map((row: any) => ({
      athlete_id: row.athlete_id,
      first_name: row.athletes.first_name,
      last_name: row.athletes.last_name,
      grad_year: row.athletes.grad_year,
      event_group: row.athletes.event_group ?? null,
    }));

  return NextResponse.json({ athletes });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ programId: string; teamId: string; scenarioId: string }> }
) {
  const { programId, teamId, scenarioId } = await ctx.params;

  const { supabase } = supabaseServer(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Resolve internal user id
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!userRow) {
    return NextResponse.json({ error: "User record not found" }, { status: 403 });
  }

  // Ensure viewer is a member of this program
  const { data: memberRow, error: memberError } = await supabaseAdmin
    .from("program_members")
    .select("id")
    .eq("program_id", programId)
    .eq("user_id", userRow.id)
    .maybeSingle();

  if (memberError) {
    console.error("[returning-candidates] membership error", memberError);
    return NextResponse.json({ error: "Failed to verify membership" }, { status: 500 });
  }

  if (!memberRow) {
    return NextResponse.json({ error: "Not a member of this program" }, { status: 403 });
  }

  // Ensure scenario belongs to this program/team (prevents cross-tenant writes)
  const { data: scenarioRow, error: scenarioError } = await supabaseAdmin
    .from("roster_scenarios")
    .select("id, program_id, team_id")
    .eq("id", scenarioId)
    .maybeSingle();

  if (scenarioError || !scenarioRow) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  if (scenarioRow.program_id !== programId || scenarioRow.team_id !== teamId) {
    return NextResponse.json(
      { error: "Scenario does not belong to this team/program" },
      { status: 403 }
    );
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const athleteId = String(body?.athlete_id ?? body?.athleteId ?? "").trim();
  const isReturning = body?.is_returning ?? body?.isReturning;

  if (!athleteId) {
    return NextResponse.json({ error: "athlete_id is required" }, { status: 400 });
  }

  if (typeof isReturning !== "boolean") {
    return NextResponse.json({ error: "is_returning must be a boolean" }, { status: 400 });
  }

  // Current program-level storage: program_athletes.status
  // - is_returning=false => status='not_returning'
  // - is_returning=true  => status=NULL (clears the flag)
  const nextStatus = isReturning ? null : "not_returning";

  // Upsert into program_athletes for this program + athlete
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("program_athletes")
    .select("id")
    .eq("program_id", programId)
    .eq("athlete_id", athleteId)
    .maybeSingle();

  if (existingError) {
    console.error("[returning-candidates] existing program_athletes error", existingError);
    return NextResponse.json({ error: "Failed to load program athlete" }, { status: 500 });
  }

  if (existing?.id) {
    const { error: updateError } = await supabaseAdmin
      .from("program_athletes")
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (updateError) {
      console.error("[returning-candidates] update program_athletes error", updateError);
      return NextResponse.json({ error: "Failed to update program athlete" }, { status: 500 });
    }
  } else {
    const { error: insertError } = await supabaseAdmin
      .from("program_athletes")
      .insert({
        program_id: programId,
        athlete_id: athleteId,
        relationship_type: "roster",
        source: "housekeeping",
        status: nextStatus,
        created_by_program_member_id: memberRow.id,
      });

    if (insertError) {
      console.error("[returning-candidates] insert program_athletes error", insertError);
      return NextResponse.json({ error: "Failed to create program athlete" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, athlete_id: athleteId, status: nextStatus });
}
