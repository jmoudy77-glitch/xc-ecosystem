// app/api/programs/[programId]/teams/[teamId]/roster-scenarios/[scenarioId]/entries/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MANAGER_ROLES = ["head_coach", "director", "admin"] as const;

type RouteContext = {
  // In Next 16, params comes in as a Promise
  params: Promise<{
    programId: string;
    teamId: string;
    scenarioId: string;
  }>;
};

type ViewerResult =
  | {
      ok: true;
      viewerUserId: string;
      role: string | null;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

async function getViewerAndMembership(
  req: NextRequest,
  programId: string
): Promise<ViewerResult> {
  const { supabase } = await supabaseServer(req);

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn("[ScenarioEntries] auth.getUser error:", authError.message);
  }

  if (!authUser) {
    return { ok: false, status: 401, error: "Not authenticated" };
  }

  const authId = authUser.id;

  // Map auth user -> users row
  const { data: userRow, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, auth_id, email")
    .eq("auth_id", authId)
    .maybeSingle();

  if (userError) {
    console.error("[ScenarioEntries] users select error:", userError);
    return {
      ok: false,
      status: 500,
      error: `Failed to load viewer record: ${userError.message}`,
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

  // Check membership & role
  const { data: membershipRow, error: membershipError } = await supabaseAdmin
    .from("program_members")
    .select("id, role, program_id")
    .eq("program_id", programId)
    .eq("user_id", viewerUserId)
    .maybeSingle();

  if (membershipError) {
    console.error("[ScenarioEntries] membership error:", membershipError);
    return {
      ok: false,
      status: 500,
      error: `Failed to verify program membership: ${membershipError.message}`,
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

  return { ok: true, viewerUserId, role };
}

/**
 * GET /api/programs/[programId]/teams/[teamId]/roster-scenarios/[scenarioId]/entries
 *
 * Returns scenario entries enriched with athlete display fields used by the scenario UI.
 * Response: { entries: [...] }
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const { programId, teamId, scenarioId } = await ctx.params;

  const viewer = await getViewerAndMembership(req, programId);
  if (!viewer.ok) {
    return NextResponse.json(
      { error: viewer.error },
      { status: viewer.status }
    );
  }

  // Make sure the scenario belongs to this program + team
  const { data: scenarioRow, error: scenarioError } = await supabaseAdmin
    .from("roster_scenarios")
    .select("id, program_id, team_id")
    .eq("id", scenarioId)
    .maybeSingle();

  if (scenarioError) {
    console.error("[ScenarioEntries] scenario lookup error:", scenarioError);
    return NextResponse.json(
      { error: "Failed to load scenario" },
      { status: 500 }
    );
  }

  if (
    !scenarioRow ||
    scenarioRow.program_id !== programId ||
    scenarioRow.team_id !== teamId
  ) {
    return NextResponse.json(
      { error: "Scenario does not belong to this program/team" },
      { status: 403 }
    );
  }

  // Load entries with join-derived athlete identity fields
  const { data: rows, error: rowsError } = await supabaseAdmin
    .from("roster_scenario_entries")
    .select(
      `
        id,
        scenario_id,
        athlete_id,
        program_recruit_id,
        projected_role,
        projected_status,
        projected_class_year,
        event_group,
        scholarship_amount,
        scholarship_unit,
        scholarship_notes,
        notes,
        created_at,
        athlete:athletes(first_name,last_name,grad_year),
        recruit:program_recruits(
          athlete:athletes(first_name,last_name,grad_year)
        )
      `
    )
    .eq("scenario_id", scenarioId)
    .order("created_at", { ascending: false });

  if (rowsError) {
    console.error("[ScenarioEntries] entries select error:", rowsError);
    return NextResponse.json(
      { error: "Failed to load scenario entries" },
      { status: 500 }
    );
  }

  const entries = (rows || []).map((r: any) => {
    const a = r.athlete;
    const ra = r.recruit?.athlete;

    const first = a?.first_name ?? ra?.first_name ?? null;
    const last = a?.last_name ?? ra?.last_name ?? null;

    const athlete_name =
      first && last ? `${first} ${last}` : first || last || null;

    const grad_year = a?.grad_year ?? ra?.grad_year ?? null;

    return {
      id: r.id,
      scenario_id: r.scenario_id,
      athlete_id: r.athlete_id,
      program_recruit_id: r.program_recruit_id,
      projected_role: r.projected_role ?? null,
      projected_status: r.projected_status ?? null,
      projected_class_year: r.projected_class_year ?? null,
      event_group: r.event_group ?? null,
      scholarship_amount: r.scholarship_amount ?? null,
      scholarship_unit: r.scholarship_unit ?? null,
      scholarship_notes: r.scholarship_notes ?? null,
      notes: r.notes ?? null,
      created_at: r.created_at,
      athlete_name,
      grad_year,
    };
  });

  return NextResponse.json({ entries }, { status: 200 });
}

/**
 * POST /api/programs/[programId]/teams/[teamId]/roster-scenarios/[scenarioId]/entries
 *
 * Minimal “add an entry to this scenario” handler.
 * Expects JSON like:
 * {
 *   "athlete_id": "uuid" | null,
 *   "program_recruit_id": "uuid" | null,
 *   "projected_status": "text" (optional),
 *   "projected_role": "text" (optional),
 *   "projected_class_year": number (optional),
 *   "event_group": "text" (optional),
 *   "scholarship_amount": number (optional),
 *   "scholarship_unit": "percent" | "amount" (optional),
 *   "scholarship_notes": "text" (optional),
 *   "notes": "text" (optional)
 * }
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { programId, teamId, scenarioId } = await ctx.params;

  const viewer = await getViewerAndMembership(req, programId);
  if (!viewer.ok) {
    return NextResponse.json(
      { error: viewer.error },
      { status: viewer.status }
    );
  }

  const role = viewer.role;
  const isManager =
    !!role &&
    MANAGER_ROLES.includes(
      role.toLowerCase() as (typeof MANAGER_ROLES)[number]
    );

  if (!isManager) {
    return NextResponse.json(
      {
        error: "Only head coaches / admins can modify scenario entries",
      },
      { status: 403 }
    );
  }

  // Make sure the scenario belongs to this program + team
  const { data: scenarioRow, error: scenarioError } = await supabaseAdmin
    .from("roster_scenarios")
    .select("id, program_id, team_id")
    .eq("id", scenarioId)
    .maybeSingle();

  if (scenarioError) {
    console.error("[ScenarioEntries] scenario lookup error:", scenarioError);
    return NextResponse.json(
      { error: "Failed to load scenario" },
      { status: 500 }
    );
  }

  if (
    !scenarioRow ||
    scenarioRow.program_id !== programId ||
    scenarioRow.team_id !== teamId
  ) {
    return NextResponse.json(
      { error: "Scenario does not belong to this program/team" },
      { status: 403 }
    );
  }

  // Parse body
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const athleteId = (body?.athlete_id as string | undefined) ?? null;
  const programRecruitId =
    (body?.program_recruit_id as string | undefined) ?? null;

  const projectedStatus =
    (body?.projected_status as string | undefined)?.trim() || null;
  const projectedRole =
    (body?.projected_role as string | undefined)?.trim() || null;
  const projectedClassYearRaw = body?.projected_class_year as
    | number
    | string
    | undefined;
  const projectedClassYear =
    projectedClassYearRaw === undefined || projectedClassYearRaw === null
      ? null
      : Number(projectedClassYearRaw);

  const eventGroup = (body?.event_group as string | undefined)?.trim() || null;

  const scholarshipAmountRaw = body?.scholarship_amount as
    | number
    | string
    | undefined;
  const scholarshipAmount =
    scholarshipAmountRaw === undefined || scholarshipAmountRaw === null
      ? null
      : Number(scholarshipAmountRaw);

  const rawUnit = (body?.scholarship_unit as string | undefined)?.trim() || null;
  const scholarshipUnit =
    rawUnit === "percent" || rawUnit === "amount" ? rawUnit : null;

  const scholarshipNotes =
    (body?.scholarship_notes as string | undefined)?.trim() || null;

  const notes = (body?.notes as string | undefined)?.trim() || null;

  if (!athleteId && !programRecruitId) {
    return NextResponse.json(
      {
        error:
          "Either athlete_id or program_recruit_id is required to create an entry",
      },
      { status: 400 }
    );
  }

  if (athleteId && programRecruitId) {
    return NextResponse.json(
      {
        error:
          "Provide only one of athlete_id or program_recruit_id when creating an entry",
      },
      { status: 400 }
    );
  }

  if (athleteId) {
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("roster_scenario_entries")
      .select("id")
      .eq("scenario_id", scenarioId)
      .eq("athlete_id", athleteId)
      .maybeSingle();

    if (existingError) {
      console.error("[ScenarioEntries] duplicate check error:", existingError);
      return NextResponse.json(
        { error: "Failed to verify existing scenario entries" },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { error: "This athlete is already in the scenario" },
        { status: 409 }
      );
    }
  }

  if (programRecruitId) {
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("roster_scenario_entries")
      .select("id")
      .eq("scenario_id", scenarioId)
      .eq("program_recruit_id", programRecruitId)
      .maybeSingle();

    if (existingError) {
      console.error("[ScenarioEntries] duplicate check error:", existingError);
      return NextResponse.json(
        { error: "Failed to verify existing scenario entries" },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { error: "This recruit is already in the scenario" },
        { status: 409 }
      );
    }
  }

  // Insert into roster_scenario_entries
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("roster_scenario_entries")
    .insert({
      scenario_id: scenarioId,
      athlete_id: athleteId,
      program_recruit_id: programRecruitId,
      projected_status: projectedStatus,
      projected_role: projectedRole,
      projected_class_year: Number.isFinite(projectedClassYear)
        ? projectedClassYear
        : null,
      event_group: eventGroup,
      scholarship_amount: Number.isFinite(scholarshipAmount)
        ? scholarshipAmount
        : null,
      scholarship_unit: scholarshipUnit,
      scholarship_notes: scholarshipNotes,
      notes,
    })
    .select("*")
    .single();

  if (insertError) {
    console.error("[ScenarioEntries] insert error:", insertError);
    return NextResponse.json(
      { error: "Failed to create scenario entry" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { entry: inserted },
    { status: 201 }
  );
}