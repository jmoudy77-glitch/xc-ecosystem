// app/api/programs/[programId]/training/practices/[practiceId]/groups/[groupId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";

type Ctx = { params: Promise<Record<string, string>> };

const updateGroupSchema = z.object({
  label: z.string().min(1).optional(),
  eventGroup: z.string().min(1).optional(),
  workoutId: z.string().uuid().optional(),
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

// GET: single group + assignments count
export async function GET(req: NextRequest, { params }: Ctx) {
  const { programId, practiceId, groupId } = await params;

  const { supabase, errorResponse } = await getProgramMemberOrError(req, programId);
  if (errorResponse) return errorResponse;

  const { data: group, error: groupError } = await supabase
    .from("practice_groups")
    .select("id, practice_plan_id, label, event_group, workout_id")
    .eq("id", groupId)
    .eq("practice_plan_id", practiceId)
    .maybeSingle();

  if (groupError) {
    console.error("[GET practice group] group error", groupError);
    return NextResponse.json(
      { error: "Failed to load practice group" },
      { status: 500 }
    );
  }

  if (!group) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: assignments, error: assignmentsError } = await supabase
    .from("practice_group_assignments")
    .select("id")
    .eq("practice_group_id", groupId);

  if (assignmentsError) {
    console.error("[GET practice group] assignments error", assignmentsError);
  }

  const athleteCount = assignments ? assignments.length : 0;

  return NextResponse.json(
    {
      group: {
        ...group,
        athleteCount,
      },
    },
    { status: 200 }
  );
}

// PATCH: update label / eventGroup / workoutId
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { programId, practiceId, groupId } = await params;

  const { supabase, errorResponse } = await getProgramMemberOrError(req, programId);
  if (errorResponse) return errorResponse;

  const json = await req.json().catch(() => null);
  const parsed = updateGroupSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { label, eventGroup, workoutId } = parsed.data;

  if (!label && !eventGroup && !workoutId) {
    return NextResponse.json(
      { error: "No fields to update" },
      { status: 400 }
    );
  }

  const updatePayload: Record<string, any> = {};
  if (label) updatePayload.label = label;
  if (eventGroup) updatePayload.event_group = eventGroup;
  if (workoutId) updatePayload.workout_id = workoutId;

  const { error: updateError } = await supabase
    .from("practice_groups")
    .update(updatePayload)
    .eq("id", groupId)
    .eq("practice_plan_id", practiceId);

  if (updateError) {
    console.error("[PATCH practice group] update error", updateError);
    return NextResponse.json(
      { error: "Failed to update practice group" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

// DELETE: delete group + its assignments
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { programId, practiceId, groupId } = await params;

  const { supabase, errorResponse } = await getProgramMemberOrError(req, programId);
  if (errorResponse) return errorResponse;

  const { error: assignmentsError } = await supabase
    .from("practice_group_assignments")
    .delete()
    .eq("practice_group_id", groupId);

  if (assignmentsError) {
    console.error("[DELETE practice group] delete assignments error", assignmentsError);
    return NextResponse.json(
      { error: "Failed to delete group assignments" },
      { status: 500 }
    );
  }

  const { error: groupError } = await supabase
    .from("practice_groups")
    .delete()
    .eq("id", groupId)
    .eq("practice_plan_id", practiceId);

  if (groupError) {
    console.error("[DELETE practice group] delete group error", groupError);
    return NextResponse.json(
      { error: "Failed to delete practice group" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}