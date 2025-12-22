// app/(system)/api/programs/[programId]/training/calendar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

const querySchema = z.object({
  from: dateSchema,
  to: dateSchema,
});

type CalendarEvent = {
  id: string;
  type: "training";
  date: string; // YYYY-MM-DD
  startTime: string | null; // ISO
  endTime: string | null; // ISO
  title: string;
  location: string | null;
  status: "planned" | "published" | "completed" | "canceled";
  teamId: string | null;
  teamLabel: string | null;
  ownerProgramMemberId: string | null;
  isSelectable: boolean;
};

async function requireProgramMember(supabase: any, programId: string) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  }

  // Map auth user -> app user (public.users.auth_id)
  const { data: appUser, error: appUserError } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (appUserError || !appUser?.id) {
    return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  }

  const { data: member, error: memberError } = await supabase
    .from("program_members")
    .select("id")
    .eq("program_id", programId)
    .eq("user_id", appUser.id)
    .maybeSingle();

  if (memberError || !member?.id) {
    return { ok: false as const, status: 403 as const, error: "Forbidden" };
  }

  return { ok: true as const, userId: appUser.id, memberId: member.id };
}

function toDateOnly(isoOrDate: string | null): string | null {
  if (!isoOrDate) return null;
  // If it’s already YYYY-MM-DD, keep it. If ISO, split.
  const idx = isoOrDate.indexOf("T");
  return idx >= 0 ? isoOrDate.slice(0, idx) : isoOrDate;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ programId: string }> },
) {
  const { programId } = await params;
  const { supabase } = supabaseServer(req);

  const membership = await requireProgramMember(supabase, programId);
  if (!membership.ok) {
    return NextResponse.json(
      { error: membership.error },
      { status: membership.status },
    );
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { from, to } = parsed.data;

  // Pull program-wide practices, optionally enriched with team label via team_season -> team.
  // Note: left joins here because team_season_id can be null.
  const { data, error } = await supabase
    .from("practice_plans")
    .select(
      `
      id,
      practice_date,
      start_time,
      end_time,
      label,
      location,
      status,
      created_by_program_member_id,
      team_season_id,
      team_seasons (
        team_id,
        teams (
          id,
          name,
          code
        )
      )
    `,
    )
    .eq("program_id", programId)
    .gte("practice_date", from)
    .lte("practice_date", to)
    .order("practice_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    console.error("[training/calendar] query error:", error);
    return NextResponse.json(
      { error: "Failed to load training calendar" },
      { status: 500 },
    );
  }

  const events: CalendarEvent[] = (data ?? []).map((row: any) => {
    const teamSeason = row.team_seasons ?? null;
    const teamsRel = teamSeason?.teams ?? null;

    const teamId: string | null =
      (teamsRel?.id as string) ?? (teamSeason?.team_id as string) ?? null;

    const teamLabel: string | null =
      (teamsRel?.code as string) ??
      (teamsRel?.name as string) ??
      null;

    const ownerProgramMemberId: string | null =
      (row.created_by_program_member_id as string) ?? null;

    const isSelectable = ownerProgramMemberId === membership.memberId;

    return {
      id: row.id as string,
      type: "training",
      date: toDateOnly(row.practice_date) as string,
      startTime: row.start_time ? (row.start_time as string) : null,
      endTime: row.end_time ? (row.end_time as string) : null,
      title: (row.label as string) ?? "Practice",
      location: (row.location as string) ?? null,
      status: (row.status as CalendarEvent["status"]) ?? "planned",
      teamId,
      teamLabel,
      ownerProgramMemberId,
      isSelectable,
    };
  });

  return NextResponse.json({
    from,
    to,
    programId,
    events,
  });
}