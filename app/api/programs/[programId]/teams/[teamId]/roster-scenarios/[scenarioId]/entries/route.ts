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
  const { supabase } = supabaseServer(req);

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
 * POST /api/programs/[programId]/teams/[teamId]/roster-scenarios/[scenarioId]/entries
 *
 * Minimal “add an entry to this scenario” handler.
 * Expects JSON like:
 * {
 *   "athlete_id": "uuid" | null,
 *   "program_recruit_id": "uuid" | null,
 *   "status": "planned" | "offer" | "commit" | ... (optional),
 *   "notes": "optional text"
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

  const athleteId =
    (body?.athlete_id as string | undefined) ?? null;
  const programRecruitId =
    (body?.program_recruit_id as string | undefined) ?? null;
  const status =
    (body?.status as string | undefined)?.trim() || "planned";
  const notes =
    (body?.notes as string | undefined)?.trim() || null;

  if (!athleteId && !programRecruitId) {
    return NextResponse.json(
      {
        error:
          "Either athlete_id or program_recruit_id is required to create an entry",
      },
      { status: 400 }
    );
  }

  // Insert into roster_scenario_entries
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("roster_scenario_entries")
    .insert({
      scenario_id: scenarioId,
      athlete_id: athleteId,
      program_recruit_id: programRecruitId,
      status,
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