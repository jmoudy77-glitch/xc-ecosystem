import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/app/lib/supabase/service";

type EligibilityStatus = "eligible" | "ineligible" | "unknown";

function requireAdminKey(req: Request) {
  const expected = process.env.M3_ADMIN_KEY;
  if (!expected) throw new Error("Missing env var: M3_ADMIN_KEY");

  const provided =
    req.headers.get("x-m3-admin-key") ?? req.headers.get("X-M3-ADMIN-KEY");

  if (!provided || provided !== expected) {
    const err: any = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
}

async function countAbsences(supabase: any, programId: string): Promise<number> {
  // Recruitable absences source: absence_determinations (Program Health sovereign)
  const { count, error } = await supabase
    .from("absence_determinations")
    .select("id", { count: "exact", head: true })
    .eq("program_id", programId);

  if (error) throw error;
  return count ?? 0;
}

async function countProgramRecruits(
  supabase: any,
  programId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("program_recruits")
    .select("id", { count: "exact", head: true })
    .eq("program_id", programId);

  if (error) throw error;
  return count ?? 0;
}

function deriveEligibility(params: {
  absencesCount: number;
  recruitsCount: number;
}): { status: EligibilityStatus; reasonCodes: string[] } {
  const { absencesCount, recruitsCount } = params;

  const reasonCodes: string[] = [];

  if (absencesCount <= 0) reasonCodes.push("NO_RECRUITABLE_ABSENCES");
  if (recruitsCount <= 0) reasonCodes.push("NO_PROGRAM_RECRUITS");

  if (reasonCodes.includes("NO_RECRUITABLE_ABSENCES")) {
    return { status: "ineligible", reasonCodes };
  }

  if (reasonCodes.includes("NO_PROGRAM_RECRUITS")) {
    return { status: "unknown", reasonCodes };
  }

  return { status: "eligible", reasonCodes };
}

export async function POST(req: Request) {
  try {
    requireAdminKey(req);

    const body = (await req.json().catch(() => ({}))) as any;
    const programId: string | null = body?.programId ?? null;

    const supabase = getSupabaseServiceClient();

    // Resolve program set
    const programsQuery = supabase
      .from("programs")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(2000);

    const { data: programs, error: programsErr } = programId
      ? await programsQuery.eq("id", programId)
      : await programsQuery;

    if (programsErr) throw programsErr;

    const rows = (programs ?? []).filter((p: any) => p?.id);

    let updated = 0;
    let ineligible = 0;
    let unknown = 0;
    let eligible = 0;

    const results: Array<{
      programId: string;
      absencesCount: number;
      recruitsCount: number;
      status: EligibilityStatus;
      reasonCodes: string[];
    }> = [];

    for (const p of rows) {
      const pid = String(p.id);
      const [absencesCount, recruitsCount] = await Promise.all([
        countAbsences(supabase, pid),
        countProgramRecruits(supabase, pid),
      ]);

      const { status, reasonCodes } = deriveEligibility({
        absencesCount,
        recruitsCount,
      });

      if (status === "eligible") eligible++;
      if (status === "ineligible") ineligible++;
      if (status === "unknown") unknown++;

      const upsertPayload = {
        program_id: pid,
        status,
        reason_codes: reasonCodes,
        min_data_snapshot: {
          absences_count: absencesCount,
          program_recruits_count: recruitsCount,
          recruits_linkage: "program_recruits(program_id -> recruit_id)",
        },
        computed_at: new Date().toISOString(),
        computed_by: "system:m3_eligibility_recompute_v2",
      };

      const { error: upsertErr } = await supabase
        .from("recruiting_m3_program_eligibility")
        .upsert(upsertPayload, { onConflict: "program_id" });

      if (upsertErr) throw upsertErr;

      updated++;

      results.push({
        programId: pid,
        absencesCount,
        recruitsCount,
        status,
        reasonCodes,
      });
    }

    return NextResponse.json(
      {
        ok: true,
        scope: programId ? "single_program" : "all_programs",
        updated,
        eligible,
        ineligible,
        unknown,
        results,
      },
      { status: 200 }
    );
  } catch (e: any) {
    const status = e?.status ?? 400;
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status }
    );
  }
}
