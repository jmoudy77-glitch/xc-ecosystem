// app/api/programs/[programId]/training/practices/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";

const createPracticeSchema = z.object({
  teamSeasonId: z.string().uuid(),
  practiceDate: z.string().date().or(z.string().min(1)), // ISO string
  label: z.string().min(1),
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

// GET: list practice plans for a team season (optional date filters)
export async function GET(req: NextRequest, context: any) {
  const { programId } = context.params;
  const { searchParams } = new URL(req.url);

  const teamSeasonId = searchParams.get("teamSeasonId");
  const from = searchParams.get("from"); // YYYY-MM-DD
  const to = searchParams.get("to");     // YYYY-MM-DD

  if (!teamSeasonId) {
    return NextResponse.json(
      { error: "teamSeasonId is required" },
      { status: 400 }
    );
  }

  const { supabase, errorResponse } = await getProgramMemberOrError(req, programId);
  if (errorResponse) return errorResponse;

  let query = supabase
    .from("practice_plans")
    .select("id, program_id, team_season_id, practice_date, label, created_at")
    .eq("program_id", programId)
    .eq("team_season_id", teamSeasonId);

  if (from) {
    query = query.gte("practice_date", from);
  }
  if (to) {
    query = query.lte("practice_date", to);
  }

  const { data, error } = await query.order("practice_date", { ascending: true });

  if (error) {
    console.error("[GET practices] error", error);
    return NextResponse.json(
      { error: "Failed to load practice plans" },
      { status: 500 }
    );
  }

  return NextResponse.json({ practices: data ?? [] }, { status: 200 });
}

// POST: create a new practice plan
export async function POST(req: NextRequest, context: any) {
  const { programId } = context.params;

  const { supabase, programMember, errorResponse } = await getProgramMemberOrError(
    req,
    programId
  );
  if (errorResponse) return errorResponse;

  const json = await req.json().catch(() => null);
  const parsed = createPracticeSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { teamSeasonId, practiceDate, label } = parsed.data;

  // (Optional) verify team season belongs to program
  const { data: ts, error: tsError } = await supabase
    .from("team_seasons")
    .select("id, program_id")
    .eq("id", teamSeasonId)
    .eq("program_id", programId)
    .maybeSingle();

  if (tsError) {
    console.error("[POST practice] team_seasons error", tsError);
    return NextResponse.json(
      { error: "Failed to verify team season" },
      { status: 500 }
    );
  }

  if (!ts) {
    return NextResponse.json(
      { error: "Invalid teamSeasonId for this program" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("practice_plans")
    .insert({
      program_id: programId,
      team_season_id: teamSeasonId,
      practice_date: practiceDate,
      label,
      created_by_program_member_id: programMember.id,
    })
    .select("id, program_id, team_season_id, practice_date, label, created_at")
    .single();

  if (error) {
    console.error("[POST practice] insert error", error);
    return NextResponse.json(
      { error: "Failed to create practice" },
      { status: 500 }
    );
  }

  return NextResponse.json({ practice: data }, { status: 201 });
}