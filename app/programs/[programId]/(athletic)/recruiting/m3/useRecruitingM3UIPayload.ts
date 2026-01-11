"use client";

import * as React from "react";

type Horizon = "H0" | "H1" | "H2" | "H3";

export type M3RecruitImpactSummary = {
  bandTier: 0 | 1 | 2 | 3;
  capabilityNodeIds: string[];
  horizons: Horizon[];
};

export type RecruitingM3UIPayload = {
  recruitSummariesById: Record<string, M3RecruitImpactSummary>;
  capabilitySupportById: Record<string, { capabilityNodeId: string; isSupported: boolean }>;
  generatedAt: string;
};

export function useRecruitingM3UIPayload(programId: string, sport: "xc" | "tf") {
  const [payload, setPayload] = React.useState<RecruitingM3UIPayload | null>(null);

  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch(
          `/api/recruiting/m3/ui?programId=${encodeURIComponent(programId)}&sport=${encodeURIComponent(sport)}`
        );
        if (!res.ok) return;
        const json = await res.json();
        if (!alive) return;
        if (!json?.ok || !json?.data) return;
        setPayload(json.data as RecruitingM3UIPayload);
      } catch {
        // inactive-safe: swallow; UI renders null adornments
      }
    })();

    return () => {
      alive = false;
    };
  }, [programId, sport]);

  return payload;
}
