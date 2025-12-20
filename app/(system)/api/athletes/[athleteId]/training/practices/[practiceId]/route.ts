// app/api/programs/[programId]/training/practices/[practiceId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";

const updatePracticeSchema = z.object({
  label: z.string().min(1).optional(),
  practiceDate: z.string().min(1).optional(), // ISO date string
});

async function getProgramMemberOrError(req: NextRequest, programId: string) {
  const { supabase } = supabaseServer(req);

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

// GET: single practice + groups (and assignment counts)
export async function GET(req: NextRequest, context: any) {
  const { programId, practiceId } = context.params;

  const { supabase, errorResponse } = await getProgramMemberOrError(req, programId);
  if (errorResponse) return errorResponse;

  const { data: practice, error: practiceError } = await supabase
    .from("practice_plans")
    .select("id, program_id, team_season_id, practice_date, label, created_at")
    .eq("id", practiceId)
    .eq("program_id", programId)
    .maybeSingle();

  if (practiceError) {
    console.error("[GET practice] practice error", practiceError);
    return NextResponse.json(
      { error: "Failed to load practice" },
      { status: 500 }
    );
  }

  if (!practice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: groups, error: groupsError } = await supabase
    .from("practice_groups")
    .select("id, practice_plan_id, label, event_group, workout_id")
    .eq("practice_plan_id", practiceId);

  if (groupsError) {
    console.error("[GET practice] groups error", groupsError);
    return NextResponse.json(
      { error: "Failed to load practice groups" },
      { status: 500 }
    );
  }

  // Optional: assignment counts per group
  const groupIds = (groups ?? []).map((g) => g.id);

  let assignmentCounts: Record<string, number> = {};
  if (groupIds.length > 0) {
    const { data: assignments, error: assignmentsError } = await supabase
      .from("practice_group_assignments")
      .select("practice_group_id")
      .in("practice_group_id", groupIds);

    if (assignmentsError) {
      console.error("[GET practice] assignments error", assignmentsError);
    } else {
      assignmentCounts = (assignments ?? []).reduce((acc, row) => {
        acc[row.practice_group_id] = (acc[row.practice_group_id] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    }
  }

  const groupsWithCounts = (groups ?? []).map((g) => ({
    ...g,
    athleteCount: assignmentCounts[g.id] ?? 0,
  }));

  return NextResponse.json(
    {
      practice: {
        ...practice,
        groups: groupsWithCounts,
      },
    },
    { status: 200 }
  );
}

// PATCH: update label and/or date
export async function PATCH(req: NextRequest, context: any) {
  const { programId, practiceId } = context.params;

  const { supabase, errorResponse } = await getProgramMemberOrError(req, programId);
  if (errorResponse) return errorResponse;

  const json = await req.json().catch(() => null);
  const parsed = updatePracticeSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { label, practiceDate } = parsed.data;

  if (!label && !practiceDate) {
    return NextResponse.json(
      { error: "No fields to update" },
      { status: 400 }
    );
  }

  const updatePayload: Record<string, any> = {};
  if (label) updatePayload.label = label;
  if (practiceDate) updatePayload.practice_date = practiceDate;

  const { error: updateError } = await supabase
    .from("practice_plans")
    .update(updatePayload)
    .eq("id", practiceId)
    .eq("program_id", programId);

  if (updateError) {
    console.error("[PATCH practice] update error", updateError);
    return NextResponse.json(
      { error: "Failed to update practice" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

// DELETE: delete practice + groups + assignments
export async function DELETE(req: NextRequest, context: any) {
  const { programId, practiceId } = context.params;

  const { supabase, errorResponse } = await getProgramMemberOrError(req, programId);
  if (errorResponse) return errorResponse;

  // Delete assignments
  const { error: assignmentsError } = await supabase
    .from("practice_group_assignments")
    .delete()
    .eq("practice_plan_id", practiceId);

  if (assignmentsError) {
    console.error("[DELETE practice] delete assignments error", assignmentsError);
    return NextResponse.json(
      { error: "Failed to delete practice assignments" },
      { status: 500 }
    );
  }

  // Delete groups
  const { error: groupsError } = await supabase
    .from("practice_groups")
    .delete()
    .eq("practice_plan_id", practiceId);

  if (groupsError) {
    console.error("[DELETE practice] delete groups error", groupsError);
    return NextResponse.json(
      { error: "Failed to delete practice groups" },
      { status: 500 }
    );
  }

  // Delete practice plan
  const { error: practiceError } = await supabase
    .from("practice_plans")
    .delete()
    .eq("id", practiceId)
    .eq("program_id", programId);

  if (practiceError) {
    console.error("[DELETE practice] delete practice error", practiceError);
    return NextResponse.json(
      { error: "Failed to delete practice" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}