// app/(system)/api/programs/[programId]/athletes/[athleteId]/performances/route.ts
// Coach-facing API: fetch athlete performances (PBs + recent)

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(
  req: NextRequest,
  ctx: {
    params:
      | { programId: string; athleteId: string }
      | Promise<{ programId: string; athleteId: string }>;
  }
) {
  try {
    const { programId, athleteId } = await Promise.resolve(ctx.params);
    const { searchParams } = new URL(req.url);

    const eventCode = searchParams.get("eventCode");
    const type = searchParams.get("type"); // verified_meet | self_reported | training
    const from = searchParams.get("from"); // YYYY-MM-DD
    const to = searchParams.get("to"); // YYYY-MM-DD
    const limit = Number(searchParams.get("limit") ?? 50);

    const { supabase } = supabaseServer(req);

    // 🔐 Authorization: ensure user has access to program
    const { data: member, error: memberError } = await supabase
      .from("program_members")
      .select("id")
      .eq("program_id", programId)
      .maybeSingle();

    if (memberError || !member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // -----------------------------
    // Base query (recent / filtered)
    // -----------------------------

    let query = supabase
      .from("athlete_performances")
      .select("*")
      .eq("athlete_id", athleteId)
      .order("performance_date", { ascending: false })
      .limit(limit);

    if (eventCode) query = query.eq("event_code", eventCode);
    if (type) query = query.eq("performance_type", type);
    if (from) query = query.gte("performance_date", from);
    if (to) query = query.lte("performance_date", to);

    const { data: performances, error } = await query;

    if (error) {
      console.error("[performances] query error", error);
      return NextResponse.json(
        { error: "Failed to load performances" },
        { status: 500 }
      );
    }

    const rows = performances ?? [];

    function computePbs(perfRows: any[]) {
      const pbsByEvent = new Map<string, any>();

      for (const row of perfRows) {
        const key = row?.event_code;
        if (!key) continue;

        // Prefer explicit PB flag
        if (row.is_personal_best) {
          pbsByEvent.set(key, row);
          continue;
        }

        if (!pbsByEvent.has(key)) {
          pbsByEvent.set(key, row);
          continue;
        }

        const existing = pbsByEvent.get(key);

        // Time-based PB: lowest seconds wins
        if (
          row.mark_seconds !== null &&
          row.mark_seconds !== undefined &&
          existing?.mark_seconds !== null &&
          existing?.mark_seconds !== undefined
        ) {
          if (Number(row.mark_seconds) < Number(existing.mark_seconds)) {
            pbsByEvent.set(key, row);
            continue;
          }
        }

        // Field / distance PB: highest value wins
        if (
          row.mark_value !== null &&
          row.mark_value !== undefined &&
          existing?.mark_value !== null &&
          existing?.mark_value !== undefined
        ) {
          if (Number(row.mark_value) > Number(existing.mark_value)) {
            pbsByEvent.set(key, row);
            continue;
          }
        }
      }

      return Array.from(pbsByEvent.values());
    }

    // -----------------------------
    // PBs per event (Any vs Verified)
    // -----------------------------

    // “Any” PBs from the current row set (respects filters/limit)
    const personalBestsAny = computePbs(rows);

    // “Verified” PBs from a targeted verified_meet fetch (ignores limit)
    let verifiedRows: any[] = [];
    try {
      let verifiedQuery = supabase
        .from("athlete_performances")
        .select("*")
        .eq("athlete_id", athleteId)
        .eq("performance_type", "verified_meet")
        .order("performance_date", { ascending: false })
        .limit(1000);

      if (eventCode) verifiedQuery = verifiedQuery.eq("event_code", eventCode);
      if (from) verifiedQuery = verifiedQuery.gte("performance_date", from);
      if (to) verifiedQuery = verifiedQuery.lte("performance_date", to);

      const { data: vData, error: vErr } = await verifiedQuery;
      if (vErr) console.warn("[performances] verified query error", vErr);
      verifiedRows = vData ?? [];
    } catch (e) {
      console.warn("[performances] verified query unexpected", e);
    }

    const personalBestsVerified = computePbs(verifiedRows);

    // -----------------------------
    // Event metadata (event_definitions)
    // -----------------------------

    const eventCodes = Array.from(
      new Set(
        [...rows, ...personalBestsAny, ...personalBestsVerified]
          .map((r: any) => r?.event_code)
          .filter(Boolean)
      )
    );

    const eventMeta: Record<string, any> = {};
    if (eventCodes.length) {
      const { data: defs, error: defsError } = await supabase
        .from("event_definitions")
        .select(
          "event_code, display_name, measurement_unit, sport, category, gender, is_relay, is_multiround"
        )
        .in("event_code", eventCodes);

      if (defsError) {
        console.warn("[performances] event_definitions lookup failed", defsError);
      } else {
        for (const d of defs ?? []) {
          eventMeta[d.event_code] = d;
        }
      }
    }

    return NextResponse.json({
      recent: rows,
      // Back-compat
      personalBests: personalBestsAny,
      // Explicit sets
      personalBestsAny,
      personalBestsVerified,
      eventMeta,
    });
  } catch (e) {
    console.error("[performances] unexpected error", e);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}