// app/api/scoring/recompute/route.ts
//
// Server-side endpoint to trigger scoring recomputation.
// Right now this only recomputes global athlete scores and
// writes into public.athlete_scores. Program-level scoring
// will be added once the schema wiring is complete.

import { NextRequest, NextResponse } from "next/server";
import { recomputeGlobalAthleteScores } from "@/lib/scoring/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  try {
    const { updated } = await recomputeGlobalAthleteScores();

    return NextResponse.json(
      {
        ok: true,
        updated,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[/api/scoring/recompute] Failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to recompute scores",
      },
      { status: 500 }
    );
  }
}
