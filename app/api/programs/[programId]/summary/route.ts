// app/api/programs/[programId]/summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * GET /api/programs/:programId/summary
 *
 * Returns a light-weight summary of a program for use in dashboards
 * and the program overview page.
 *
 * Shape:
 * {
 *   id,
 *   name,
 *   sport,
 *   gender,
 *   level,
 *   season,
 *   school: { id, name, city, state, country, level },
 *   subscription: { planCode, status, currentPeriodEnd } | null
 * }
 */

type RouteParams = {
  params: {
    programId: string;
  };
};

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { programId } = params;

    if (!programId) {
      return NextResponse.json(
        { error: "Missing programId in route parameters" },
        { status: 400 },
      );
    }

    // 1) Load the program
    const { data: programs, error: programError } = await supabaseAdmin
      .from("programs")
      .select("id, school_id, name, sport, gender, level, season")
      .eq("id", programId)
      .limit(1);

    if (programError) {
      console.error(
        "[/api/programs/[programId]/summary] Program select error:",
        programError,
      );
      return NextResponse.json(
        { error: "Failed to load program" },
        { status: 500 },
      );
    }

    const program = programs?.[0];

    if (!program) {
      return NextResponse.json(
        { error: "Program not found" },
        { status: 404 },
      );
    }

    // 2) Load the school
    let school: any = null;
    if (program.school_id) {
      const { data: schools, error: schoolError } = await supabaseAdmin
        .from("schools")
        .select("id, name, city, state, country, level")
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
      const sub = subs[0];
      subscription = {
        planCode: sub.plan_code,
        status: sub.status,
        currentPeriodEnd: sub.current_period_end,
      };
    }

    const payload = {
      id: program.id,
      name: program.name,
      sport: program.sport,
      gender: program.gender,
      level: program.level,
      season: program.season,
      school: school
        ? {
            id: school.id,
            name: school.name,
            city: school.city,
            state: school.state,
            country: school.country,
            level: school.level,
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