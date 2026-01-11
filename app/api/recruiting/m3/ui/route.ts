import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type Horizon = "H0" | "H1" | "H2" | "H3";

type RecruitSummary = {
  bandTier: 0 | 1 | 2 | 3;
  capabilityNodeIds: string[];
  horizons: Horizon[];
};

type CapabilitySupport = {
  capabilityNodeId: string;
  isSupported: boolean;
};

function coerceSport(v: string | null): "xc" | "tf" | null {
  if (v === "xc" || v === "tf") return v;
  return null;
}

function coerceHorizon(v: unknown): Horizon | null {
  if (v === "H0" || v === "H1" || v === "H2" || v === "H3") return v;
  return null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const programId = (url.searchParams.get("programId") ?? "").trim();
    const sport = coerceSport(url.searchParams.get("sport"));

    if (!programId || !sport) {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid programId/sport" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 });
          },
        },
      }
    );

    // NOTE: UI is inactive-safe. If M3 is inactive, server-side gates should yield 0 rows; UI renders null.
    const { data, error } = await supabase
      .from("recruiting_candidate_impacts")
      .select("recruit_id, horizon, capability_node_id, cohort_tier, rationale")
      .eq("program_id", programId)
      .eq("sport", sport)
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const recruitSummariesById: Record<string, RecruitSummary> = {};
    const capabilitySupportById: Record<string, CapabilitySupport> = {};

    for (const row of data ?? []) {
      const recruitId = String((row as any).recruit_id ?? "").trim();
      const capabilityNodeId = String((row as any).capability_node_id ?? "").trim();
      const tierRaw = (row as any).cohort_tier;
      const horizon = coerceHorizon((row as any).horizon);

      if (!recruitId || !capabilityNodeId || horizon == null) continue;
      const tier: 0 | 1 | 2 | 3 =
        tierRaw === 0 || tierRaw === 1 || tierRaw === 2 || tierRaw === 3 ? tierRaw : 0;

      const existing = recruitSummariesById[recruitId];
      if (!existing) {
        recruitSummariesById[recruitId] = {
          bandTier: tier,
          capabilityNodeIds: [capabilityNodeId],
          horizons: [horizon],
        };
      } else {
        if (tier > existing.bandTier) existing.bandTier = tier;
        if (!existing.capabilityNodeIds.includes(capabilityNodeId)) {
          existing.capabilityNodeIds.push(capabilityNodeId);
        }
        if (!existing.horizons.includes(horizon)) existing.horizons.push(horizon);
      }

      if (!capabilitySupportById[capabilityNodeId]) {
        capabilitySupportById[capabilityNodeId] = { capabilityNodeId, isSupported: true };
      }
    }

    // Normalize horizon ordering to H0..H3 (compact range rendering depends on order)
    const order: Record<Horizon, number> = { H0: 0, H1: 1, H2: 2, H3: 3 };
    for (const k of Object.keys(recruitSummariesById)) {
      recruitSummariesById[k].horizons.sort((a, b) => order[a] - order[b]);
    }

    return NextResponse.json({
      ok: true,
      data: {
        recruitSummariesById,
        capabilitySupportById,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
