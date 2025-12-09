//app/api/practice/refresh-heat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { refreshWeekHeatForSeason } from "@/lib/heatPolicies";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const seasonId = body?.seasonId as string | undefined;
    const weekStartIso = body?.weekStartIso as string | undefined;
    const lat = typeof body?.lat === "number" ? body.lat : 32.0;
    const lon = typeof body?.lon === "number" ? body.lon : -90.0;

    if (!seasonId) {
      return NextResponse.json(
        { error: "seasonId is required in the request body." },
        { status: 400 }
      );
    }

    if (!weekStartIso) {
      return NextResponse.json(
        {
          error: "weekStartIso is required in the request body (YYYY-MM-DD).",
        },
        { status: 400 }
      );
    }

    await refreshWeekHeatForSeason({
      teamSeasonId: seasonId,
      weekStartIso,
      lat,
      lon,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[refresh-heat] Unexpected error:", err);
    return NextResponse.json(
      {
        error: "Failed to refresh heat risk for this week.",
        details: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}