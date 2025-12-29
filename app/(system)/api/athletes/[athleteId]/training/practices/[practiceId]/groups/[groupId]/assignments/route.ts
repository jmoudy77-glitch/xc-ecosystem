// app/api/programs/[programId]/training/practices/[practiceId]/groups/[groupId]/assignments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";

type Ctx = { params: Promise<Record<string, string>> };

const addAssignmentsSchema = z.object({
  athletes: z
    .array(
      z.object({
        teamRosterId: z.string().uuid(),
        athleteId: z.string().uuid(),
      })
    )
    .min(1),
});

const removeAssignmentsSchema = z.object({
  assignmentIds: z.array(z.string().uuid()).optional(),
  teamRosterIds: z.array(z.string().uuid()).optional(),
});

async function getProgramMemberOrError(req: NextRequest, programId: string) {
  const { supabase } = await supabaseServer(req);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      programMember: null,
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
      programMember: null,
      errorResponse: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { supabase, programMember, errorResponse: null };
}

// GET: list assignments for a group
export async function GET(req: NextRequest, { params }: Ctx) {
  const { programId, groupId } = await params;

  const { supabase, errorResponse } = await getProgramMemberOrError(req, programId);
  if (errorResponse) return errorResponse;

  const { data, error } = await supabase
    .from("practice_group_assignments")
    .select("id, practice_group_id, team_roster_id, athlete_id")
    .eq("practice_group_id", groupId);

  if (error) {
    console.error("[GET group assignments] error", error);
    return NextResponse.json(
      { error: "Failed to load group assignments" },
      { status: 500 }
    );
  }

  return NextResponse.json({ assignments: data ?? [] }, { status: 200 });
}

// POST: add assignments to a group
export async function POST(req: NextRequest, { params }: Ctx) {
  const { programId, practiceId, groupId } = await params;

  const { supabase, errorResponse } = await getProgramMemberOrError(req, programId);
  if (errorResponse) return errorResponse;

  // optional: verify group belongs to this practice
  const { data: group, error: groupError } = await supabase
    .from("practice_groups")
    .select("id, practice_plan_id")
    .eq("id", groupId)
    .eq("practice_plan_id", practiceId)
    .maybeSingle();

  if (groupError) {
    console.error("[POST group assignments] group lookup error", groupError);
    return NextResponse.json(
      { error: "Failed to verify group" },
      { status: 500 }
    );
  }

  if (!group) {
    return NextResponse.json({ error: "Invalid groupId for practice" }, { status: 400 });
  }

  const json = await req.json().catch(() => null);
  const parsed = addAssignmentsSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { athletes } = parsed.data;

  const rows = athletes.map((a) => ({
    practice_group_id: groupId,
    team_roster_id: a.teamRosterId,
    athlete_id: a.athleteId,
    practice_plan_id: practiceId,
  }));

  const { data, error } = await supabase
    .from("practice_group_assignments")
    .insert(rows)
    .select("id, practice_group_id, team_roster_id, athlete_id");

  if (error) {
    console.error("[POST group assignments] insert error", error);
    return NextResponse.json(
      { error: "Failed to add group assignments" },
      { status: 500 }
    );
  }

  return NextResponse.json({ assignments: data ?? [] }, { status: 201 });
}

// DELETE: bulk remove assignments (by IDs or roster IDs)
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { programId, groupId } = await params;

  const { supabase, errorResponse } = await getProgramMemberOrError(req, programId);
  if (errorResponse) return errorResponse;

  const json = await req.json().catch(() => ({}));
  const parsed = removeAssignmentsSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { assignmentIds, teamRosterIds } = parsed.data;

  if (!assignmentIds && !teamRosterIds) {
    return NextResponse.json(
      { error: "Provide assignmentIds or teamRosterIds" },
      { status: 400 }
    );
  }

  let query = supabase
    .from("practice_group_assignments")
    .delete()
    .eq("practice_group_id", groupId);

  if (assignmentIds) {
    query = query.in("id", assignmentIds);
  }
  if (teamRosterIds) {
    query = query.in("team_roster_id", teamRosterIds);
  }

  const { error } = await query;

  if (error) {
    console.error("[DELETE group assignments] error", error);
    return NextResponse.json(
      { error: "Failed to delete group assignments" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}