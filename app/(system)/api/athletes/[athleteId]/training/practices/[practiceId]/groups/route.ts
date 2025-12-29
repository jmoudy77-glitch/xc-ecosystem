// app/api/programs/[programId]/training/practices/[practiceId]/groups/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";

type Ctx = { params: Promise<Record<string, string>> };

const createGroupSchema = z.object({
  label: z.string().min(1),
  eventGroup: z.string().min(1),
  workoutId: z.string().uuid(),
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

// GET: list groups for a practice
export async function GET(req: NextRequest, { params }: Ctx) {
  const { programId, practiceId } = await params;

  const { supabase, errorResponse } = await getProgramMemberOrError(req, programId);
  if (errorResponse) return errorResponse;

  const { data, error } = await supabase
    .from("practice_groups")
    .select("id, practice_plan_id, label, event_group, workout_id")
    .eq("practice_plan_id", practiceId);

  if (error) {
    console.error("[GET practice groups] error", error);
    return NextResponse.json(
      { error: "Failed to load practice groups" },
      { status: 500 }
    );
  }

  return NextResponse.json({ groups: data ?? [] }, { status: 200 });
}

// POST: create a new group on a practice
export async function POST(req: NextRequest, { params }: Ctx) {
  const { programId, practiceId } = await params;

  const { supabase, errorResponse } = await getProgramMemberOrError(req, programId);
  if (errorResponse) return errorResponse;

  // optional: verify practice belongs to program
  const { data: practice, error: practiceError } = await supabase
    .from("practice_plans")
    .select("id, program_id")
    .eq("id", practiceId)
    .eq("program_id", programId)
    .maybeSingle();

  if (practiceError) {
    console.error("[POST practice group] practice lookup error", practiceError);
    return NextResponse.json(
      { error: "Failed to verify practice" },
      { status: 500 }
    );
  }

  if (!practice) {
    return NextResponse.json({ error: "Invalid practiceId" }, { status: 400 });
  }

  const json = await req.json().catch(() => null);
  const parsed = createGroupSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { label, eventGroup, workoutId } = parsed.data;

  const { data, error } = await supabase
    .from("practice_groups")
    .insert({
      practice_plan_id: practiceId,
      label,
      event_group: eventGroup,
      workout_id: workoutId,
    })
    .select("id, practice_plan_id, label, event_group, workout_id")
    .single();

  if (error) {
    console.error("[POST practice group] insert error", error);
    return NextResponse.json(
      { error: "Failed to create practice group" },
      { status: 500 }
    );
  }

  return NextResponse.json({ group: data }, { status: 201 });
}