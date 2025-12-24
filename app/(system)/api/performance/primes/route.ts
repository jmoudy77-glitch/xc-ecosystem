// app/(system)/api/performance/primes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function parseLimit(v: string | null) {
  const n = Number(v ?? "");
  if (!Number.isFinite(n) || n <= 0) return 50;
  return Math.min(Math.floor(n), 200);
}

export async function GET(req: NextRequest) {
  try {
    const { supabase } = supabaseServer(req);

    // ---- Auth (required) ----
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.warn("[/api/performance/primes] auth.getUser error:", authError.message);
    }

    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Map Supabase auth user -> public.users row
    const authId = authUser.id;
    const { data: userRow, error: userRowError } = await supabaseAdmin
      .from("users")
      .select("id, auth_id")
      .eq("auth_id", authId)
      .maybeSingle();

    if (userRowError) {
      console.error("[/api/performance/primes] users lookup error:", userRowError);
      return NextResponse.json({ error: "Failed to resolve user" }, { status: 500 });
    }

    if (!userRow) {
      // /api/me is responsible for creating the users row; enforce that contract here.
      return NextResponse.json(
        { error: "User row missing (visit /api/me once to initialize)" },
        { status: 401 }
      );
    }

    const userId = userRow.id as string;

    // ---- Query params ----
    const url = new URL(req.url);
    const programId = url.searchParams.get("programId");
    const athleteId = url.searchParams.get("athleteId");
    const canonicalEventCode = url.searchParams.get("canonicalEventCode");

    // Accept both snake_case and camelCase for convenience.
    // UI and ad-hoc tooling sometimes send rulesetCode.
    let rulesetCodeParam = url.searchParams.get("ruleset_code");
    if (!rulesetCodeParam) rulesetCodeParam = url.searchParams.get("rulesetCode");

    const before = url.searchParams.get("before");
    const limit = parseLimit(url.searchParams.get("limit"));

    // Optional diagnostics to support process-of-elimination debugging.
    const debug = url.searchParams.get("debug") === "1";

    // ---- Authorization boundary (program-scoped by default) ----
    // For now, we treat primes as coach/program intelligence. Require a programId.
    if (!programId) {
      return NextResponse.json(
        { error: "programId is required" },
        { status: 400 }
      );
    }

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("program_members")
      .select("id")
      .eq("program_id", programId)
      .eq("user_id", userId)
      .maybeSingle();

    if (membershipError) {
      console.error("[/api/performance/primes] program_members lookup error:", membershipError);
      return NextResponse.json({ error: "Failed to check access" }, { status: 500 });
    }

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ---- Resolve ruleset ----
    // Priority:
    //  1) explicit ruleset_code query param
    //  2) most recent compute run's prime_ruleset_code (keeps read surface aligned with compute)
    //  3) active ruleset (fallback)
    let rulesetId: string | null = null;
    let rulesetCode: string | null = null;

    if (rulesetCodeParam) {
      const { data: rs, error: rsError } = await supabaseAdmin
        .from("performance_prime_rulesets")
        .select("id, ruleset_code")
        .eq("ruleset_code", rulesetCodeParam)
        .maybeSingle();

      if (rsError) {
        console.error("[/api/performance/primes] ruleset lookup error:", rsError);
        return NextResponse.json({ error: "Failed to load ruleset" }, { status: 500 });
      }

      if (!rs) {
        return NextResponse.json({ error: "Unknown ruleset_code" }, { status: 400 });
      }

      rulesetId = rs.id;
      rulesetCode = rs.ruleset_code;
    } else {
      // Try to align reads with the most recent compute run (global truth)
      const { data: lastRun, error: lastRunError } = await supabaseAdmin
        .from("performance_compute_runs")
        .select("prime_ruleset_code")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastRunError) {
        console.error("[/api/performance/primes] last compute run lookup error:", lastRunError);
        return NextResponse.json({ error: "Failed to load compute state" }, { status: 500 });
      }

      if (lastRun?.prime_ruleset_code) {
        const { data: rs, error: rsError } = await supabaseAdmin
          .from("performance_prime_rulesets")
          .select("id, ruleset_code")
          .eq("ruleset_code", lastRun.prime_ruleset_code)
          .maybeSingle();

        if (rsError) {
          console.error("[/api/performance/primes] ruleset lookup error (from last run):", rsError);
          return NextResponse.json({ error: "Failed to load ruleset" }, { status: 500 });
        }

        if (rs) {
          rulesetId = rs.id;
          rulesetCode = rs.ruleset_code;
        }
      }

      // Fallback to active ruleset if no runs exist or last run ruleset is missing
      if (!rulesetId) {
        const { data: rs, error: rsError } = await supabaseAdmin
          .from("performance_prime_rulesets")
          .select("id, ruleset_code")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (rsError) {
          console.error("[/api/performance/primes] active ruleset lookup error:", rsError);
          return NextResponse.json({ error: "Failed to load active ruleset" }, { status: 500 });
        }

        if (!rs) {
          return NextResponse.json({ error: "No active ruleset" }, { status: 500 });
        }

        rulesetId = rs.id;
        rulesetCode = rs.ruleset_code;
      }
    }

    // ---- Program athlete scope (authoritative scoping) ----
    // We scope primes to the program through program_athletes rather than relying on
    // athlete_performances.source_program_id (which may be null for imported/legacy data).
    const { data: programAthletes, error: programAthletesError } = await supabaseAdmin
      .from("program_athletes")
      .select("athlete_id")
      .eq("program_id", programId)
      .is("archived_at", null)
      .limit(5000);

    if (programAthletesError) {
      console.error("[/api/performance/primes] program_athletes lookup error:", programAthletesError);
      return NextResponse.json({ error: "Failed to load program athletes" }, { status: 500 });
    }

    const programAthleteIds = Array.from(
      new Set((programAthletes ?? []).map((pa: any) => pa.athlete_id).filter(Boolean))
    ) as string[];

    // If the program currently has no tracked athletes/recruits, primes will be empty.
    if (programAthleteIds.length === 0) {
      return NextResponse.json({
        ok: true,
        ruleset_code: rulesetCode,
        programId,
        filters: {
          ruleset_code: rulesetCode,
          athleteId: athleteId ?? null,
          canonicalEventCode: canonicalEventCode ?? null,
          before: before ?? null,
          limit,
        },
        nextBefore: null,
        items: [],
        debug: debug
          ? {
              auth_ok: true,
              membership_ok: true,
              resolved_ruleset_id: rulesetId,
              resolved_ruleset_code: rulesetCode,
              program_athlete_count: 0,
              note: "program_athletes returned 0 rows; primes are scoped via program_athletes",
            }
          : undefined,
      });
    }

    // ---- Primes query ----
    // Note: we intentionally filter through athlete_performances.source_program_id for program scoping.
    let q = supabaseAdmin
      .from("performance_primes")
      .select(
        `
        id,
        ruleset_id,
        performance_id,
        athlete_id,
        event_code,
        canonical_event_code,
        canonical_mark_seconds,
        canonical_mark_value,
        normalized_index,
        computed_at,
        athletes!performance_primes_athlete_fkey(
          id,
          first_name,
          last_name,
          grad_year,
          event_group,
          gender
        )
      `
      )
      .eq("ruleset_id", rulesetId)
      .in("athlete_id", programAthleteIds)
      .order("computed_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit);

    if (athleteId) q = q.eq("athlete_id", athleteId);
    if (canonicalEventCode) q = q.eq("canonical_event_code", canonicalEventCode);

    if (before) {
      const beforeDate = new Date(before);
      if (!Number.isNaN(beforeDate.getTime())) {
        q = q.lt("computed_at", beforeDate.toISOString());
      }
    }

    const { data: rows, error: primesError } = await q;

    if (primesError) {
      console.error("[/api/performance/primes] primes select error:", primesError);
      return NextResponse.json({ error: "Failed to load primes" }, { status: 500 });
    }

    // ---- Hydrate performance details (avoid relying on PostgREST FK alias names) ----
    const performanceIds = Array.from(
      new Set((rows ?? []).map((r: any) => r.performance_id).filter(Boolean))
    ) as string[];

    let performanceById = new Map<string, any>();

    if (performanceIds.length > 0) {
      const { data: perfs, error: perfsError } = await supabaseAdmin
        .from("athlete_performances")
        .select(
          "id,event_code,mark_seconds,mark_value,performance_date,meet_name,location,performance_type,timing_method,source_program_id,created_at"
        )
        .in("id", performanceIds);

      if (perfsError) {
        console.error("[/api/performance/primes] athlete_performances hydrate error:", perfsError);
        return NextResponse.json({ error: "Failed to load performances" }, { status: 500 });
      }

      performanceById = new Map((perfs ?? []).map((p: any) => [p.id, p]));
    }

    const items = (rows ?? []).map((r: any) => {
      const perf = r.performance_id ? performanceById.get(r.performance_id) ?? null : null;
      const athlete = r.athletes ?? null;

      return {
        id: r.id,
        ruleset_id: r.ruleset_id,
        performance_id: r.performance_id,
        athlete_id: r.athlete_id,

        event_code: r.event_code,
        canonical_event_code: r.canonical_event_code,

        canonical_mark_seconds: r.canonical_mark_seconds,
        canonical_mark_value: r.canonical_mark_value,
        normalized_index: r.normalized_index,

        computed_at: r.computed_at,

        performance: perf
          ? {
              id: perf.id,
              event_code: perf.event_code,
              mark_seconds: perf.mark_seconds,
              mark_value: perf.mark_value,
              performance_date: perf.performance_date,
              meet_name: perf.meet_name,
              location: perf.location,
              performance_type: perf.performance_type,
              timing_method: perf.timing_method,
              source_program_id: perf.source_program_id,
              created_at: perf.created_at,
            }
          : null,

        athlete: athlete
          ? {
              id: athlete.id,
              first_name: athlete.first_name,
              last_name: athlete.last_name,
              grad_year: athlete.grad_year,
              event_group: athlete.event_group,
              gender: athlete.gender,
            }
          : null,
      };
    });

    const nextBefore =
      items.length > 0 ? items[items.length - 1].computed_at ?? null : null;

    return NextResponse.json({
      ok: true,
      ruleset_code: rulesetCode,
      programId,
      filters: {
        ruleset_code: rulesetCode,
        athleteId: athleteId ?? null,
        canonicalEventCode: canonicalEventCode ?? null,
        before: before ?? null,
        limit,
      },
      nextBefore,
      items,
      debug:
        debug || items.length === 0
          ? {
              auth_ok: true,
              membership_ok: true,
              resolved_ruleset_id: rulesetId,
              resolved_ruleset_code: rulesetCode,
              program_athlete_count: programAthleteIds.length,
              note:
                items.length === 0
                  ? "0 rows after filtering by ruleset_id + program_athletes athlete_id set (and optional athleteId/canonicalEventCode/before)"
                  : "diagnostics requested",
            }
          : undefined,
    });
  } catch (e: any) {
    console.error("[/api/performance/primes] unexpected error:", e);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}