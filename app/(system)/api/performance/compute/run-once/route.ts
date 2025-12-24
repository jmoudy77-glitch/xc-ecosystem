// app/(system)/api/performance/compute/run-once/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  const locker = `api:${process.env.VERCEL_REGION ?? "local"}:${process.pid}`;

  // Track state so we can reliably fail the job/run on any thrown error.
  let job: any = null;
  let run: any = null;

  const toErrorJson = (e: any) => {
    // Normalize unknown errors into a small, JSON-safe payload.
    const out: any = {
      message: e?.message ?? String(e),
    };
    if (e?.name) out.name = e.name;
    if (e?.code) out.code = e.code;
    if (e?.details) out.details = e.details;
    if (e?.hint) out.hint = e.hint;
    if (e?.status) out.status = e.status;
    return out;
  };

  try {
    // 1) claim next job atomically
    const { data: claimed, error: claimErr } = await supabaseAdmin.rpc(
      "performance_claim_next_compute_job",
      { locker }
    );

    if (claimErr) throw claimErr;

    job = Array.isArray(claimed) ? claimed[0] : claimed;
    if (!job) {
      return NextResponse.json({ ok: true, claimed: false }, { status: 200 });
    }

    // 2) create run ledger entry (even if we no-op)
    const { data: createdRun, error: runErr } = await supabaseAdmin
      .from("performance_compute_runs")
      .insert([
        {
          queue_id: job.id,
          scope_type: job.scope_type,
          scope_id: job.scope_id,
          stages: ["primes", "athlete_rollups", "team_rollups", "signals"],
          status: "running",
          summary_json: {
            note:
              "Compute pipeline executed. Prime v1 computes deterministic normalized_index values and upserts performance_primes; Team Rollups v1 upserts team_performance_rollups; athlete rollups/signals remain scaffolded.",
          },
        },
      ])
      .select("*")
      .single();

    if (runErr) throw runErr;
    run = createdRun;

    // 3) compute stages (v1: primes + team rollups; athlete rollups/signals remain scaffolded)

    // 3a) resolve active prime ruleset + active reference set (frozen snapshot)
    const PRIME_RULESET_CODE = "performance_prime_v1";
    const REF_SET_CODE = "gb_standards_2024_2025";

    const { data: primeRuleset, error: primeRulesetErr } = await supabaseAdmin
      .from("performance_prime_rulesets")
      .select("id, ruleset_code")
      .eq("ruleset_code", PRIME_RULESET_CODE)
      .eq("is_active", true)
      .single();
    if (primeRulesetErr) throw primeRulesetErr;

    const { data: refSet, error: refSetErr } = await supabaseAdmin
      .from("performance_reference_sets")
      .select("id, set_code")
      .eq("set_code", REF_SET_CODE)
      .eq("is_active", true)
      .single();
    if (refSetErr) throw refSetErr;

    // 3b) load reference standards into an in-memory lookup keyed by event_code
    const { data: standards, error: standardsErr } = await supabaseAdmin
      .from("performance_reference_standards")
      .select(
        "event_code, gender, level, reference_mark_seconds, reference_mark_value, measurement_unit"
      )
      .eq("set_id", refSet.id);
    if (standardsErr) throw standardsErr;

    const standardsByEvent = new Map<
      string,
      {
        reference_mark_seconds: number | null;
        reference_mark_value: number | null;
        measurement_unit: string | null;
      }
    >();

    for (const s of standards ?? []) {
      // v1 matching: event_code only. gender/level are intentionally ignored unless you later populate them.
      if (!standardsByEvent.has(s.event_code)) {
        standardsByEvent.set(s.event_code, {
          reference_mark_seconds:
            s.reference_mark_seconds == null ? null : Number(s.reference_mark_seconds),
          reference_mark_value:
            s.reference_mark_value == null ? null : Number(s.reference_mark_value),
          measurement_unit: s.measurement_unit ?? null,
        });
      }
    }

    // 3c) scope resolution -> compute a list of athlete_ids when needed
    const scopeType: string = job.scope_type;
    const scopeId: string | null = job.scope_id ?? null;

    let scopedAthleteIds: string[] | null = null;

    if (scopeType === "athlete") {
      scopedAthleteIds = scopeId ? [scopeId] : [];
    } else if (scopeType === "team_season") {
      const { data: rows, error } = await supabaseAdmin
        .from("team_roster")
        .select("athlete_id")
        .eq("team_season_id", scopeId);
      if (error) throw error;
      scopedAthleteIds = (rows ?? []).map((r: any) => r.athlete_id);
    } else if (scopeType === "team") {
      const { data: rows, error } = await supabaseAdmin
        .from("team_roster")
        .select("athlete_id")
        .eq("team_id", scopeId);
      if (error) throw error;
      scopedAthleteIds = (rows ?? []).map((r: any) => r.athlete_id);
    } else if (scopeType === "program") {
      // athlete_performances does not carry program_id in the base schema. We scope by:
      // - athletes present on team_roster for this program
      // - and/or raw performances where source_program_id matches
      const { data: rows, error } = await supabaseAdmin
        .from("team_roster")
        .select("athlete_id")
        .eq("program_id", scopeId);
      if (error) throw error;
      scopedAthleteIds = (rows ?? []).map((r: any) => r.athlete_id);
    } else if (scopeType === "global") {
      scopedAthleteIds = null;
    }

    // 3d) fetch raw performances for scope
    // NOTE: keep this v1 implementation simple and deterministic; optimize later (pagination/batching).
    let perfQuery = supabaseAdmin
      .from("athlete_performances")
      .select(
        "id, athlete_id, event_code, mark_seconds, mark_value, performance_date, performance_type, timing_method, source_program_id, updated_at"
      );

    if (scopeType === "athlete" || scopeType === "team" || scopeType === "team_season") {
      if (scopedAthleteIds && scopedAthleteIds.length > 0) {
        perfQuery = perfQuery.in("athlete_id", scopedAthleteIds);
      } else {
        // No athletes in scope -> no-op primes.
        perfQuery = perfQuery.limit(0);
      }
    } else if (scopeType === "program") {
      // Prefer athlete_id scoping when roster exists; also include source_program_id matches.
      // Supabase JS does not support OR for in+eq cleanly; we do athlete_id scoping if available, otherwise source_program_id.
      if (scopedAthleteIds && scopedAthleteIds.length > 0) {
        perfQuery = perfQuery.in("athlete_id", scopedAthleteIds);
      } else if (scopeId) {
        perfQuery = perfQuery.eq("source_program_id", scopeId);
      }
    }

    const { data: performances, error: perfErr } = await perfQuery;
    if (perfErr) throw perfErr;

    // 3e) build prime rows and upsert
    let processed = 0;
    let skippedMissingMark = 0;
    let skippedMissingStandard = 0;
    let upserted = 0;

    const primeRows: any[] = [];

    const fingerprint = (p: any) => {
      // Contract: fingerprint the exact input fields used for deterministic reconstruction.
      const payload = {
        athlete_id: p.athlete_id,
        event_code: p.event_code,
        mark_seconds: p.mark_seconds,
        mark_value: p.mark_value,
        performance_date: p.performance_date,
        performance_type: p.performance_type,
        timing_method: p.timing_method,
        source_program_id: p.source_program_id,
        updated_at: p.updated_at,
      };
      return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
    };

    const normalizeEventCode = (code: any): string => {
      const raw = String(code ?? "").trim();
      if (!raw) return raw;

      // Preferred canonical namespace for v1 standards lookup: meters with "m" suffix (e.g., 5000m).
      // This aligns with seeded reference standards that include 5000m and avoids ambiguity with other catalogs.

      // Common XC patterns: 5kXC / 6kXC / 8kXC (case-insensitive) -> 5000m / 6000m / 8000m
      const kxc = raw.match(/^([0-9]+(?:\.[0-9]+)?)kXC$/i);
      if (kxc) {
        const km = Number(kxc[1]);
        if (Number.isFinite(km) && km > 0) return `${Math.round(km * 1000)}m`;
      }

      // Alternate pattern: 5000XC / 6000XC / 8000XC -> 5000m / 6000m / 8000m
      const mxc = raw.match(/^([0-9]{3,5})XC$/i);
      if (mxc) {
        const meters = Number(mxc[1]);
        if (Number.isFinite(meters) && meters > 0) return `${Math.round(meters)}m`;
      }

      // Catalog alias pattern: XC5K / XC6K / XC8K -> 5000m / 6000m / 8000m
      const xck = raw.match(/^XC\s*([0-9]+(?:\.[0-9]+)?)K$/i);
      if (xck) {
        const km = Number(xck[1]);
        if (Number.isFinite(km) && km > 0) return `${Math.round(km * 1000)}m`;
      }

      return raw;
    };

    for (const p of performances ?? []) {
      processed += 1;

      const hasTimed = p.mark_seconds != null;
      const hasField = p.mark_value != null;
      if (!hasTimed && !hasField) {
        skippedMissingMark += 1;
        continue;
      }

      // v1 canonicalization: normalize common XC aliases into canonical track-distance event codes.
      // Raw performance rows remain untouched; only the prime uses canonical_event_code.
      const canonicalEventCode = normalizeEventCode(p.event_code);
      const std = standardsByEvent.get(canonicalEventCode);
      if (!std) {
        skippedMissingStandard += 1;
        continue;
      }

      let normalizedIndex: number | null = null;
      let canonicalMarkSeconds: number | null = null;
      let canonicalMarkValue: number | null = null;

      if (hasTimed) {
        const markSec = Number(p.mark_seconds);
        const refSec = std.reference_mark_seconds;
        if (!refSec || !markSec || markSec <= 0) {
          skippedMissingStandard += 1;
          continue;
        }
        canonicalMarkSeconds = markSec;
        // Higher index = better performance. Timed events: lower time is better.
        normalizedIndex = (refSec / markSec) * 100;
      } else if (hasField) {
        const markVal = Number(p.mark_value);
        const refVal = std.reference_mark_value;
        if (!refVal || !markVal || markVal <= 0) {
          skippedMissingStandard += 1;
          continue;
        }
        canonicalMarkValue = markVal;
        // Higher index = better performance. Field events: higher mark is better.
        normalizedIndex = (markVal / refVal) * 100;
      }

      if (normalizedIndex == null) {
        skippedMissingStandard += 1;
        continue;
      }

      primeRows.push({
        ruleset_id: primeRuleset.id,
        performance_id: p.id,
        athlete_id: p.athlete_id,
        event_code: p.event_code,
        canonical_event_code: canonicalEventCode,
        canonical_mark_seconds: canonicalMarkSeconds,
        canonical_mark_value: canonicalMarkValue,
        normalized_index: normalizedIndex,
        inputs_fingerprint: fingerprint(p),
        computed_at: new Date().toISOString(),
      });
    }

    if (primeRows.length > 0) {
      const { error: upsertErr } = await supabaseAdmin
        .from("performance_primes")
        .upsert(primeRows, { onConflict: "ruleset_id,performance_id" });
      if (upsertErr) throw upsertErr;
      upserted = primeRows.length;
    }

    // Update the run ledger with deterministic version markers + summary
    const primesSummary = {
      processed,
      upserted,
      skipped_missing_mark: skippedMissingMark,
      skipped_missing_standard: skippedMissingStandard,
      prime_ruleset_code: PRIME_RULESET_CODE,
      reference_set_code: REF_SET_CODE,
    };

    // 3f) TEAM ROLLUPS v1 (deterministic, math-first)
    // Contract: rollups read primes + raw performance metadata; they never mutate raw data.
    // v1 outputs are intentionally minimal: coverage + capacity + basic dispersion.

    const rollupHash = (payload: any) =>
      crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");

    type TeamSeasonKey = { program_id: string; team_id: string; team_season_id: string | null };

    const resolveTeamSeasonScopes = async (): Promise<TeamSeasonKey[]> => {
      // We base rollups on team_roster, since it is the authoritative membership map in current schema.
      let q = supabaseAdmin
        .from("team_roster")
        .select("program_id, team_id, team_season_id");

      if (scopeType === "team_season") {
        q = q.eq("team_season_id", scopeId);
      } else if (scopeType === "team") {
        q = q.eq("team_id", scopeId);
      } else if (scopeType === "program") {
        q = q.eq("program_id", scopeId);
      } else if (scopeType === "athlete") {
        // Athlete-scoped compute does not write team rollups in v1.
        return [];
      }

      const { data, error } = await q;
      if (error) throw error;

      // De-dupe.
      const seen = new Set<string>();
      const out: TeamSeasonKey[] = [];
      for (const r of data ?? []) {
        const key = `${r.program_id}:${r.team_id}:${r.team_season_id ?? ""}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          program_id: r.program_id,
          team_id: r.team_id,
          team_season_id: r.team_season_id ?? null,
        });
      }
      return out;
    };

    const computeStdDev = (nums: number[]) => {
      if (nums.length < 2) return null;
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      const variance =
        nums.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (nums.length - 1);
      return Math.sqrt(variance);
    };

    const computeTeamRollupsV1 = async (keys: TeamSeasonKey[]) => {
      let rollupProcessed = 0;
      let rollupUpserted = 0;

      for (const k of keys) {
        rollupProcessed += 1;

        // Resolve athlete ids for this membership scope.
        let rosterQ = supabaseAdmin
          .from("team_roster")
          .select("athlete_id")
          .eq("program_id", k.program_id)
          .eq("team_id", k.team_id);

        if (k.team_season_id) rosterQ = rosterQ.eq("team_season_id", k.team_season_id);

        const { data: rosterRows, error: rosterErr } = await rosterQ;
        if (rosterErr) throw rosterErr;

        const athleteIds = (rosterRows ?? []).map((r: any) => r.athlete_id).filter(Boolean);
        const athletesTotal = athleteIds.length;

        // If no roster athletes, still write a deterministic rollup row (coverage=0) for UI wiring.
        // Lens codes (fluid):
        // - "season" => team_season scoped
        // - "three_year" => team aggregate window (now - 3y)

        const lensesToCompute: Array<{
          lens_code: "season" | "three_year";
          subject_type: "team_season" | "team_window";
          subject_id: string;
          date_from: string | null;
          date_to: string | null;
        }> = [];

        // Season lens
        if (k.team_season_id) {
          lensesToCompute.push({
            lens_code: "season",
            subject_type: "team_season",
            subject_id: k.team_season_id,
            date_from: null,
            date_to: null,
          });
        }

        // Long-range window lens (year + two previous seasons) implemented as a 3-year date window.
        lensesToCompute.push({
          lens_code: "three_year",
          subject_type: "team_window",
          subject_id: k.team_id,
          date_from: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365 * 3).toISOString(),
          date_to: new Date().toISOString(),
        });

        for (const lens of lensesToCompute) {
          // Determine performance filter bounds.
          // Season lens (team_season): if we can resolve season dates, use them; otherwise include all.
          let seasonStart: string | null = null;
          let seasonEnd: string | null = null;

          if (lens.lens_code === "season" && k.team_season_id) {
            const { data: ts, error: tsErr } = await supabaseAdmin
              .from("team_seasons")
              .select("start_date, end_date")
              .eq("id", k.team_season_id)
              .single();
            if (tsErr) {
              // If not found, proceed with null bounds.
              seasonStart = null;
              seasonEnd = null;
            } else {
              seasonStart = ts?.start_date ? new Date(ts.start_date).toISOString() : null;
              seasonEnd = ts?.end_date ? new Date(ts.end_date).toISOString() : null;
            }
          }

          const dateFrom = lens.lens_code === "three_year" ? lens.date_from : seasonStart;
          const dateTo = lens.lens_code === "three_year" ? lens.date_to : seasonEnd;

          // Fetch primes joined to raw performance so we can lens by performance_date.
          // NOTE: we do NOT rely on any program_id on the raw performance layer.
          let primesQ = supabaseAdmin
            .from("performance_primes")
            .select(
              "id, athlete_id, canonical_event_code, normalized_index, computed_at, performance:athlete_performances(performance_date)"
            )
            .eq("ruleset_id", primeRuleset.id);

          if (athleteIds.length > 0) {
            primesQ = primesQ.in("athlete_id", athleteIds);
          } else {
            primesQ = primesQ.limit(0);
          }

          const { data: primesRows, error: primesErr } = await primesQ;
          if (primesErr) throw primesErr;

          // Apply lens date filtering in-process (Supabase nested filters are brittle for date bounds).
          const filtered = (primesRows ?? []).filter((r: any) => {
            const d = r?.performance?.performance_date;
            if (!d) return false;
            const t = new Date(d).getTime();
            if (dateFrom && t < new Date(dateFrom).getTime()) return false;
            if (dateTo && t > new Date(dateTo).getTime()) return false;
            return true;
          });

          // Derive athlete best (max normalized_index) within lens.
          const bestByAthlete = new Map<string, number>();
          const eventsCovered = new Set<string>();

          for (const r of filtered) {
            if (!r?.athlete_id) continue;
            const idx = Number(r.normalized_index);
            if (!Number.isFinite(idx)) continue;

            const prev = bestByAthlete.get(r.athlete_id);
            if (prev == null || idx > prev) bestByAthlete.set(r.athlete_id, idx);

            if (r.canonical_event_code) eventsCovered.add(String(r.canonical_event_code));
          }

          const athleteBest = Array.from(bestByAthlete.values());
          const athletesWithPrimes = athleteBest.length;

          const meanBest =
            athleteBest.length === 0
              ? null
              : athleteBest.reduce((a, b) => a + b, 0) / athleteBest.length;

          const sorted = athleteBest.slice().sort((a, b) => b - a);
          const top5 = sorted.slice(0, 5);
          const top5Mean =
            top5.length === 0 ? null : top5.reduce((a, b) => a + b, 0) / top5.length;

          const volatility = computeStdDev(athleteBest);

          const coveragePct =
            athletesTotal === 0 ? 0 : Math.round((athletesWithPrimes / athletesTotal) * 1000) / 10;

          const scoring_capacity_json = {
            athletes_total: athletesTotal,
            athletes_with_primes: athletesWithPrimes,
            avg_best_normalized_index: meanBest,
            top5_avg_best_normalized_index: top5Mean,
            note:
              "v1 capacity uses athlete best normalized_index within lens; future versions will incorporate event weighting and points models.",
          };

          const coverage_depth_json = {
            athletes_total: athletesTotal,
            athletes_with_primes: athletesWithPrimes,
            coverage_pct: coveragePct,
            distinct_events_covered: eventsCovered.size,
            note:
              "v1 coverage reports roster coverage and distinct canonical events represented in primes for the lens.",
          };

          const inputs_fingerprint = rollupHash({
            v: 1,
            ruleset_id: primeRuleset.id,
            program_id: k.program_id,
            team_id: k.team_id,
            team_season_id: k.team_season_id,
            subject_type: lens.subject_type,
            subject_id: lens.subject_id,
            lens_code: lens.lens_code,
            date_from: dateFrom,
            date_to: dateTo,
            athlete_ids: athleteIds,
            athlete_best: bestByAthlete,
          });

          const rollupRow: any = {
            ruleset_id: primeRuleset.id,
            program_id: k.program_id,
            team_id: k.team_id,
            // Option A: team_season rollups are keyed to a team_season_id; team_window rollups are keyed to team_id and keep team_season_id NULL.
            team_season_id: lens.subject_type === "team_season" ? k.team_season_id : null,
            subject_type: lens.subject_type,
            subject_id: lens.subject_id,
            lens_code: lens.lens_code,
            scoring_capacity_json,
            coverage_depth_json,
            team_trajectory_index: null,
            team_volatility_index: volatility,
            computed_at: new Date().toISOString(),
            inputs_fingerprint,
          };

          const { error: rollupUpsertErr } = await supabaseAdmin
            .from("team_performance_rollups")
            .upsert(rollupRow, {
              onConflict: "ruleset_id,subject_type,subject_id,lens_code",
            });
          if (rollupUpsertErr) throw rollupUpsertErr;

          rollupUpserted += 1;
        }
      }

      return { processed: rollupProcessed, upserted: rollupUpserted };
    };

    const teamSeasonKeys = await resolveTeamSeasonScopes();
    const teamRollupsSummary = await computeTeamRollupsV1(teamSeasonKeys);

    const { error: runUpdateErr } = await supabaseAdmin
      .from("performance_compute_runs")
      .update({
        prime_ruleset_code: PRIME_RULESET_CODE,
        summary_json: {
          ...(run.summary_json ?? {}),
          primes: primesSummary,
          team_rollups: {
            ...teamRollupsSummary,
            note:
              "Team Rollups v1 upserts team_performance_rollups for lens_code=season (team_season) when available and lens_code=three_year (team window).",
          },
        },
      })
      .eq("id", run.id);

    if (runUpdateErr) throw runUpdateErr;

    // 4) mark job done (for now) — later we’ll mark succeeded/failed based on stage outcomes
    const { error: doneErr } = await supabaseAdmin.rpc(
      "performance_mark_compute_job_done",
      { job_id: job.id }
    );
    if (doneErr) throw doneErr;

    // 5) close out run
    const { error: closeErr } = await supabaseAdmin
      .from("performance_compute_runs")
      .update({
        status: "succeeded",
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    if (closeErr) throw closeErr;

    // 6) re-read final persisted state for curl-driven clarity
    const { data: finalJob, error: finalJobErr } = await supabaseAdmin
      .from("performance_compute_queue")
      .select("*")
      .eq("id", job.id)
      .single();
    if (finalJobErr) throw finalJobErr;

    const { data: finalRun, error: finalRunErr } = await supabaseAdmin
      .from("performance_compute_runs")
      .select("*")
      .eq("id", run.id)
      .single();
    if (finalRunErr) throw finalRunErr;

    return NextResponse.json(
      { ok: true, claimed: true, job: finalJob, run: finalRun },
      { status: 200 }
    );
  } catch (e: any) {
    const errJson = toErrorJson(e);
    console.error("[/api/performance/compute/run-once] Failed:", errJson);

    // Best-effort: mark queue job failed (only if we actually claimed one)
    if (job?.id) {
      const { error: failJobErr } = await supabaseAdmin.rpc(
        "performance_mark_compute_job_failed",
        { job_id: job.id, err: errJson }
      );
      if (failJobErr) {
        console.error(
          "[/api/performance/compute/run-once] Failed to mark job failed:",
          toErrorJson(failJobErr)
        );
      }
    }

    // Best-effort: close run as failed (only if run row exists)
    if (run?.id) {
      const { error: failRunErr } = await supabaseAdmin
        .from("performance_compute_runs")
        .update({
          status: "failed",
          error_json: errJson,
          finished_at: new Date().toISOString(),
        })
        .eq("id", run.id);

      if (failRunErr) {
        console.error(
          "[/api/performance/compute/run-once] Failed to update run as failed:",
          toErrorJson(failRunErr)
        );
      }
    }

    return NextResponse.json({ ok: false, error: "run_once_failed", err: errJson }, { status: 500 });
  }
}