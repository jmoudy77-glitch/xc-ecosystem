// app/(system)/api/performance/rollups/athletes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type AthleteRollup = {
  athlete: {
    id: string;
    first_name: string;
    last_name: string;
    grad_year: number | null;
    event_group: string | null;
    gender: string | null;
  };
  summary: {
    primes_count: number;
    best_index: number | null;
    avg_index: number | null;
    last_computed_at: string | null;
    most_recent_performance_date: string | null;
    top_events: Array<{ canonical_event_code: string; best_index: number }>;
  };
};

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const programId = url.searchParams.get("programId");
  const rulesetCode = url.searchParams.get("ruleset_code") || "performance_prime_v1";
  const limitParam = url.searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitParam || 50), 1), 200);

  if (!programId) {
    return NextResponse.json({ error: "Missing programId" }, { status: 400 });
  }

  const { supabase, res } = supabaseServer(req);

  // Require auth. Program scoping should be enforced by RLS on program_athletes / performance tables.
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401, headers: res.headers });
  }

  // Resolve ruleset_id from ruleset_code (ruleset table introduced in Performance Module v1).
  const { data: rulesetRow, error: rulesetErr } = await supabase
    .from("performance_rulesets")
    .select("id, code")
    .eq("code", rulesetCode)
    .limit(1)
    .maybeSingle();

  if (rulesetErr) {
    console.error("[performance/rollups/athletes] ruleset lookup failed", rulesetErr);
    return NextResponse.json(
      { error: "Failed to resolve ruleset" },
      { status: 500, headers: res.headers }
    );
  }

  if (!rulesetRow?.id) {
    return NextResponse.json(
      { ok: true, programId, ruleset_code: rulesetCode, items: [] },
      { status: 200, headers: res.headers }
    );
  }

  // Pull athletes for this program (canonical source for program scope).
  const { data: programAthletes, error: paErr } = await supabase
    .from("program_athletes")
    .select("athlete_id")
    .eq("program_id", programId)
    .is("archived_at", null);

  if (paErr) {
    console.error("[performance/rollups/athletes] program_athletes fetch failed", paErr);
    return NextResponse.json(
      { error: "Failed to load program athletes" },
      { status: 500, headers: res.headers }
    );
  }

  const athleteIds = (programAthletes || []).map((r: any) => r.athlete_id).filter(Boolean);
  if (athleteIds.length === 0) {
    return NextResponse.json(
      { ok: true, programId, ruleset_code: rulesetCode, items: [] },
      { status: 200, headers: res.headers }
    );
  }

  // Pull primes for those athletes under the resolved ruleset.
  // Note: joins are optional; if schema differs, the rollup still succeeds with partial fields.
  const { data: primes, error: primesErr } = await supabase
    .from("performance_primes")
    .select(
      [
        "athlete_id",
        "ruleset_id",
        "canonical_event_code",
        "normalized_index",
        "computed_at",
        "performance_id",
        "performance:athlete_performances(performance_date)",
        "athlete:athletes(id, first_name, last_name, grad_year, event_group, gender)",
      ].join(",")
    )
    .eq("ruleset_id", rulesetRow.id)
    .in("athlete_id", athleteIds);

  if (primesErr) {
    console.error("[performance/rollups/athletes] primes fetch failed", primesErr);
    return NextResponse.json({ error: "Failed to load primes" }, { status: 500, headers: res.headers });
  }

  // Aggregate in memory (v1). This is deterministic and keeps compute boundary clean.
  const byAthlete = new Map<string, AthleteRollup>();

  for (const row of primes || []) {
    const athleteId = (row as any).athlete_id as string;
    if (!athleteId) continue;

    const athlete = (row as any).athlete || (row as any).athlete?.[0];
    const a = athlete
      ? {
          id: athlete.id || athleteId,
          first_name: athlete.first_name ?? "",
          last_name: athlete.last_name ?? "",
          grad_year: athlete.grad_year ?? null,
          event_group: athlete.event_group ?? null,
          gender: athlete.gender ?? null,
        }
      : {
          id: athleteId,
          first_name: "",
          last_name: "",
          grad_year: null,
          event_group: null,
          gender: null,
        };

    if (!byAthlete.has(athleteId)) {
      byAthlete.set(athleteId, {
        athlete: a,
        summary: {
          primes_count: 0,
          best_index: null,
          avg_index: null,
          last_computed_at: null,
          most_recent_performance_date: null,
          top_events: [],
        },
      });
    }

    const entry = byAthlete.get(athleteId)!;

    const idx = toNum((row as any).normalized_index);
    const computedAt = (row as any).computed_at ? String((row as any).computed_at) : null;
    const canonicalEventCode = (row as any).canonical_event_code ? String((row as any).canonical_event_code) : null;

    const perf = (row as any).performance;
    const perfDate = perf?.performance_date ? String(perf.performance_date) : null;

    // count
    entry.summary.primes_count += 1;

    // best_index
    if (idx !== null) {
      entry.summary.best_index = entry.summary.best_index === null ? idx : Math.max(entry.summary.best_index, idx);

      // incremental average
      const prevAvg = entry.summary.avg_index;
      const n = entry.summary.primes_count;
      entry.summary.avg_index = prevAvg === null ? idx : prevAvg + (idx - prevAvg) / n;

      // per-event best
      if (canonicalEventCode) {
        const existing = entry.summary.top_events.find((e) => e.canonical_event_code === canonicalEventCode);
        if (!existing) {
          entry.summary.top_events.push({ canonical_event_code: canonicalEventCode, best_index: idx });
        } else {
          existing.best_index = Math.max(existing.best_index, idx);
        }
      }
    }

    // last_computed_at
    if (computedAt) {
      if (!entry.summary.last_computed_at || computedAt > entry.summary.last_computed_at) {
        entry.summary.last_computed_at = computedAt;
      }
    }

    // most_recent_performance_date
    if (perfDate) {
      if (!entry.summary.most_recent_performance_date || perfDate > entry.summary.most_recent_performance_date) {
        entry.summary.most_recent_performance_date = perfDate;
      }
    }
  }

  // Reduce top_events list per athlete and sort.
  const items = Array.from(byAthlete.values()).map((r) => {
    r.summary.top_events = r.summary.top_events
      .sort((a, b) => b.best_index - a.best_index)
      .slice(0, 5);
    return r;
  });

  // Sort athletes by best_index desc, then by last name.
  items.sort((a, b) => {
    const ai = a.summary.best_index ?? -Infinity;
    const bi = b.summary.best_index ?? -Infinity;
    if (bi !== ai) return bi - ai;
    const al = (a.athlete.last_name || "").toLowerCase();
    const bl = (b.athlete.last_name || "").toLowerCase();
    return al.localeCompare(bl);
  });

  return NextResponse.json(
    {
      ok: true,
      ruleset_code: rulesetCode,
      programId,
      items: items.slice(0, limit),
    },
    { status: 200, headers: res.headers }
  );
}