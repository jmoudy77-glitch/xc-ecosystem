// app/api/programs/[programId]/teams/[teamId]/roster-scenarios/[scenarioId]/status/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type ScenarioStatus = "draft" | "candidate" | "active";

function isScenarioStatus(v: any): v is ScenarioStatus {
  return v === "draft" || v === "candidate" || v === "active";
}

function isElevatedRole(role: string | null | undefined) {
  // Promote / return-to-planning should be restricted to elevated authority.
  return role === "owner" || role === "admin" || role === "head_coach";
}

function isCoachRole(role: string | null | undefined) {
  // Day-to-day roster planning permissions.
  return (
    role === "owner" ||
    role === "admin" ||
    role === "head_coach" ||
    role === "coach" ||
    role === "manager"
  );
}

export async function POST(
  req: NextRequest,
  ctx: { params: { programId: string; teamId: string; scenarioId: string } }
) {
  try {
    const { programId, teamId, scenarioId } = ctx.params;

    const { supabase } = supabaseServer(req);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      status?: ScenarioStatus;
      /** Optional convenience: treat as 'return to planning' and set candidate */
      returnToPlanning?: boolean;
    };

    const requested: any = body.returnToPlanning ? "candidate" : body.status;

    if (!isScenarioStatus(requested)) {
      return NextResponse.json(
        { error: "Invalid status. Must be draft | candidate | active." },
        { status: 400 }
      );
    }

    // Verify membership / role
    const { data: member, error: memberError } = await supabase
      .from("program_members")
      .select("id, role")
      .eq("program_id", programId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memberError) {
      return NextResponse.json(
        { error: "Failed to verify membership" },
        { status: 500 }
      );
    }

    if (!member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const role = (member as any).role as string | null;

    // Permissions:
    // - Mark candidate / draft requires coach role
    // - Promote to active and return-to-planning (active -> candidate) require elevated
    if (requested === "active") {
      if (!isElevatedRole(role)) {
        return NextResponse.json(
          { error: "Only Head Coaches or Admins can promote to Active." },
          { status: 403 }
        );
      }
    } else {
      if (!isCoachRole(role)) {
        return NextResponse.json(
          { error: "You do not have permission to change scenario status." },
          { status: 403 }
        );
      }

      // If they are returning an Active roster to planning, treat as elevated.
      if (body.returnToPlanning && !isElevatedRole(role)) {
        return NextResponse.json(
          { error: "Only Head Coaches or Admins can return Active roster to planning." },
          { status: 403 }
        );
      }
    }

    // Load scenario (must belong to this program/team)
    const { data: scenario, error: scenarioError } = await supabase
      .from("roster_scenarios")
      .select("id, program_id, team_id, status")
      .eq("id", scenarioId)
      .eq("program_id", programId)
      .eq("team_id", teamId)
      .maybeSingle();

    if (scenarioError) {
      return NextResponse.json(
        { error: "Failed to load scenario" },
        { status: 500 }
      );
    }

    if (!scenario) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    const currentStatus = ((scenario as any).status as ScenarioStatus | null) ??
      "draft";

    // If season lock exists in the future, enforce here. For now, we allow
    // demotion/promotion at the scenario layer; season-lock will be enforced
    // once roster_scenarios is reliably linked to team_seasons.

    // If promoting to active, demote any existing active for this program/team.
    if (requested === "active") {
      const { error: demoteError } = await supabase
        .from("roster_scenarios")
        .update({ status: "candidate" })
        .eq("program_id", programId)
        .eq("team_id", teamId)
        .eq("status", "active")
        .neq("id", scenarioId);

      if (demoteError) {
        return NextResponse.json(
          { error: "Failed to clear existing Active scenario" },
          { status: 500 }
        );
      }
    }

    // If returning Active to planning, only allow when current is active.
    if (body.returnToPlanning && currentStatus !== "active") {
      return NextResponse.json(
        { error: "Only an Active roster can be returned to planning." },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("roster_scenarios")
      .update({ status: requested })
      .eq("id", scenarioId)
      .eq("program_id", programId)
      .eq("team_id", teamId)
      .select("id, status")
      .maybeSingle();

    if (updateError) {
      // If unique active constraint is hit, return a conflict.
      const msg = (updateError as any)?.message as string | undefined;
      if (msg && msg.toLowerCase().includes("duplicate") && requested === "active") {
        return NextResponse.json(
          { error: "Another scenario is already Active. Try again." },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Failed to update scenario status" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, scenario: updated });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Unexpected error", details: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
