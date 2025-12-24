// app/(system)/api/performance/rollups/teams/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

/**
 * Team Performance Rollups (v1)
 *
 * Returns precomputed team rollups produced by the Performance Compute pipeline.
 *
 * Query params:
 * - programId (required)
 * - mode (optional; default: rollups)
 *    - rollups: returns rows from team_performance_rollups
 *    - balance: returns rows from performance_balance_snapshots
 * - ruleset_code (optional; default: performance_prime_v1)
 * - lens_code (optional)
 *
 * Rollups mode only:
 * - subject_type (optional; team_season | team_window)
 * - subject_id (optional)
 *
 * Balance mode only:
 * - team_id (optional)
 * - team_season_id (optional)
 *
 * Shared:
 * - before (optional; ISO timestamp cursor on computed_at)
 * - limit (optional; default 50, max 100)
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    const rawProgramId = url.searchParams.get("programId");
    const modeRaw = url.searchParams.get("mode");
    const mode = (modeRaw || "rollups").toLowerCase();

    const programId = rawProgramId?.trim().replace(/^["']|["']$/g, "") || null;
    if (!programId) {
      return NextResponse.json(
        { ok: false, error: "programId_required" },
        { status: 400 }
      );
    }

    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!UUID_RE.test(programId)) {
      return NextResponse.json(
        { ok: false, error: "programId_invalid_uuid", programId_raw: rawProgramId },
        { status: 400 }
      );
    }

    const rulesetCode = url.searchParams.get("ruleset_code") || "performance_prime_v1";
    const lensCode = url.searchParams.get("lens_code");
    const subjectType = url.searchParams.get("subject_type");
    const rawSubjectId = url.searchParams.get("subject_id");
    const subjectId = rawSubjectId?.trim().replace(/^["']|["']$/g, "") || null;

    const rawTeamId = url.searchParams.get("team_id");
    const teamId = rawTeamId?.trim().replace(/^["']|["']$/g, "") || null;

    const rawTeamSeasonId = url.searchParams.get("team_season_id");
    const teamSeasonId = rawTeamSeasonId?.trim().replace(/^["']|["']$/g, "") || null;

    const before = url.searchParams.get("before");
    const rawLimit = url.searchParams.get("limit");
    const limit = Math.min(Math.max(parseInt(rawLimit || "50", 10) || 50, 1), 100);

    const { supabase } = supabaseServer(req);

    // Auth gate (RLS should also enforce, but we fail fast with a clean message)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // ---------------------------------------------------------------------
    // Balance mode: map-level equilibrium snapshots (program + team lenses)
    // ---------------------------------------------------------------------
    if (mode === "balance") {
      // Validate optional UUID filters
      if (teamId && !UUID_RE.test(teamId)) {
        return NextResponse.json(
          { ok: false, error: "team_id_invalid_uuid", team_id_raw: rawTeamId },
          { status: 400 }
        );
      }

      if (teamSeasonId && !UUID_RE.test(teamSeasonId)) {
        return NextResponse.json(
          {
            ok: false,
            error: "team_season_id_invalid_uuid",
            team_season_id_raw: rawTeamSeasonId,
          },
          { status: 400 }
        );
      }

      // In balance mode, we keep the default `ruleset_code` param but map it to
      // the stored snapshot field `prime_ruleset_code`.
      let qb = supabase
        .from("performance_balance_snapshots")
        .select("*")
        .eq("program_id", programId)
        .eq("prime_ruleset_code", rulesetCode)
        .order("computed_at", { ascending: false })
        .limit(limit + 1);

      if (lensCode) qb = qb.eq("lens_code", lensCode);
      if (teamId) qb = qb.eq("team_id", teamId);
      if (teamSeasonId) qb = qb.eq("team_season_id", teamSeasonId);
      if (before) qb = qb.lt("computed_at", before);

      const { data: balRows, error: balErr } = await qb;

      if (balErr) {
        return NextResponse.json(
          { ok: false, error: "balance_query_failed", details: balErr },
          { status: 500 }
        );
      }

      type BalanceRow = { computed_at: string | null; [key: string]: any };
      const rows = (balRows || []) as unknown as BalanceRow[];
      const items = rows.slice(0, limit);
      const hasMore = rows.length > limit;
      const nextBefore = hasMore ? items[items.length - 1]?.computed_at ?? null : null;

      return NextResponse.json({
        ok: true,
        mode: "balance",
        prime_ruleset_code: rulesetCode,
        programId,
        filters: {
          prime_ruleset_code: rulesetCode,
          lens_code: lensCode,
          team_id: teamId,
          team_season_id: teamSeasonId,
          before: before,
          limit,
        },
        nextBefore,
        items,
      });
    }

    // Guard against unknown modes
    if (mode !== "rollups") {
      return NextResponse.json(
        { ok: false, error: "invalid_mode", mode: modeRaw },
        { status: 400 }
      );
    }

    // Resolve ruleset_id from ruleset_code to prevent accidental cross-version mixing.
    const { data: rulesetRow, error: rulesetErr } = await supabase
      .from("performance_prime_rulesets")
      .select("id, ruleset_code")
      .eq("ruleset_code", rulesetCode)
      .maybeSingle();

    if (rulesetErr) {
      return NextResponse.json(
        { ok: false, error: "ruleset_lookup_failed", details: rulesetErr },
        { status: 500 }
      );
    }

    if (!rulesetRow) {
      return NextResponse.json(
        { ok: false, error: "unknown_ruleset_code", ruleset_code: rulesetCode },
        { status: 400 }
      );
    }

    // Base query
    // NOTE: We select `*` to avoid coupling this route to optional JSON columns
    // (e.g., `summary_json`) that may not exist in early migrations.
    let q = supabase
      .from("team_performance_rollups")
      .select("*")
      .eq("program_id", programId)
      .eq("ruleset_id", rulesetRow.id)
      .order("computed_at", { ascending: false })
      .limit(limit + 1);

    if (lensCode) q = q.eq("lens_code", lensCode);
    if (subjectType) q = q.eq("subject_type", subjectType);
    if (subjectId) {
      if (!UUID_RE.test(subjectId)) {
        return NextResponse.json(
          { ok: false, error: "subject_id_invalid_uuid", subject_id_raw: rawSubjectId },
          { status: 400 }
        );
      }
      q = q.eq("subject_id", subjectId);
    }
    if (before) q = q.lt("computed_at", before);

    const { data, error } = await q;

    if (error) {
      return NextResponse.json(
        { ok: false, error: "rollups_query_failed", details: error },
        { status: 500 }
      );
    }

    // Supabase returns rows typed as `any` unless you provide generics; we keep the shape minimal
    // here so `computed_at` is safely addressable.
    type TeamRollupRow = { computed_at: string | null; [key: string]: any };

    const rows = (data || []) as unknown as TeamRollupRow[];
    const items = rows.slice(0, limit);
    const hasMore = rows.length > limit;
    const nextBefore = hasMore ? items[items.length - 1]?.computed_at ?? null : null;

    return NextResponse.json({
      ok: true,
      mode: "rollups",
      ruleset_code: rulesetRow.ruleset_code,
      programId,
      filters: {
        ruleset_code: rulesetRow.ruleset_code,
        lens_code: lensCode,
        subject_type: subjectType,
        subject_id: subjectId,
        before: before,
        limit,
      },
      nextBefore,
      items,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "teams_rollups_failed", message: e?.message || String(e) },
      { status: 500 }
    );
  }
}