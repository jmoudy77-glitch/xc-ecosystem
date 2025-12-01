// app/api/programs/[programId]/summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * GET /api/programs/:programId/summary
 *
 * Returns a light-weight summary of a program for use in dashboards
 * and the program overview / billing pages.
 */

export async function GET(req: NextRequest) {
  try {
    // Always parse programId from the URL path (ignore Next.js params to avoid edge issues)
    const url = new URL(req.url);
    const match = url.pathname.match(/\/api\/programs\/([^/]+)\/summary/);
    const programId = match?.[1];

    if (!programId) {
      console.error(
        "[/api/programs/[programId]/summary] Could not extract programId from path:",
        url.pathname,
      );
      return NextResponse.json(
        { error: "Missing programId in route parameters" },
        { status: 400 },
      );
    }

    // 1) Load the program
    // Use select("*") so we don't error if some columns (level, season, etc.) aren't present yet.
    const { data: programs, error: programError } = await supabaseAdmin
      .from("programs")
      .select("*")
      .eq("id", programId)
      .limit(1);

    if (programError) {
      console.error(
        "[/api/programs/[programId]/summary] Program select error:",
        programError,
      );
      return NextResponse.json(
        { error: "Failed to load program from database" },
        { status: 500 },
      );
    }

    const program = programs?.[0] as any;

    if (!program) {
      return NextResponse.json(
        { error: "Program not found" },
        { status: 404 },
      );
    }

    // 2) Load the school (optional)
    let school: any = null;
    if (program.school_id) {
      const { data: schools, error: schoolError } = await supabaseAdmin
        .from("schools")
        .select("*")
        .eq("id", program.school_id)
        .limit(1);

      if (schoolError) {
        console.error(
          "[/api/programs/[programId]/summary] School select error:",
          schoolError,
        );
      } else if (schools && schools.length > 0) {
        school = schools[0];
      }
    }

    // 3) Load the most recent subscription (if any)
    let subscription: any = null;

    // If the table doesn't exist yet, this will error; we log and continue.
    const { data: subs, error: subsError } = await supabaseAdmin
      .from("program_subscriptions")
      .select("plan_code, status, current_period_end")
      .eq("program_id", program.id)
      .order("current_period_end", { ascending: false })
      .limit(1);

    if (subsError) {
      console.error(
        "[/api/programs/[programId]/summary] Subscription select error:",
        subsError,
      );
    } else if (subs && subs.length > 0) {
      const sub = subs[0] as any;
      subscription = {
        planCode: sub.plan_code ?? null,
        status: sub.status ?? null,
        currentPeriodEnd: sub.current_period_end ?? null,
      };
    }

    const payload = {
      id: program.id,
      name: program.name ?? null,
      sport: program.sport ?? null,
      gender: program.gender ?? null,
      level: program.level ?? null,
      season: program.season ?? null,
      school: school
        ? {
            id: school.id,
            name: school.name ?? null,
            city: school.city ?? null,
            state: school.state ?? null,
            country: school.country ?? null,
            level: school.level ?? null,
          }
        : null,
      subscription,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    console.error(
      "[/api/programs/[programId]/summary] Unexpected error:",
      err,
    );
    const message =
      err instanceof Error ? err.message : "Failed to load program summary";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
