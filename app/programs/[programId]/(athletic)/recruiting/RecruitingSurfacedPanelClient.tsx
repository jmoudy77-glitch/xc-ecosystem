// app/programs/[programId]/(athletic)/recruiting/RecruitingSurfacedPanelClient.tsx

"use client";

import * as React from "react";
import { readRecruitingM1View } from "@/app/actions/recruiting/readRecruitingM1View";
import {
  RecruitingCandidateChip,
  type RecruitingPanelCandidate,
} from "./RecruitingCandidateChip";
import {
  addToFavoritesIfMissing,
} from "@/app/lib/recruiting/portalStorage";

export function RecruitingSurfacedPanelClient({ programId }: { programId: string }) {
  const [rows, setRows] = React.useState<RecruitingPanelCandidate[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const model: any = await readRecruitingM1View(programId);
        const cohort = Array.isArray(model?.cohort)
          ? model.cohort
          : Array.isArray(model?.candidates)
            ? model.candidates
            : [];
        const mapped: RecruitingPanelCandidate[] = cohort
          .map((c: any) => {
            const athleteId = String(c?.athlete_id ?? c?.athleteId ?? c?.id ?? "").trim();
            const displayName = String(c?.display_name ?? c?.displayName ?? c?.name ?? "").trim();
            if (!athleteId || !displayName) return null;
            return {
              athleteId,
              displayName,
              eventGroup: (c?.event_group ?? c?.eventGroup ?? null) as any,
              gradYear:
                (typeof c?.grad_year === "number" ? c.grad_year :
                typeof c?.gradYear === "number" ? c.gradYear : null) as any,
              originKey: "surfaced",
              originMeta: (c?.originMeta && typeof c.originMeta === "object" ? c.originMeta : {}) as any,
            } satisfies RecruitingPanelCandidate;
          })
          .filter(Boolean) as RecruitingPanelCandidate[];

        if (!alive) return;
        setRows(mapped);
        setErr(null);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "Failed to load surfaced");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [programId]);

  const addToFavorites = async (c: RecruitingPanelCandidate) => {
    try {
      await fetch("/api/recruiting/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId,
          sport: "xc",
          athleteId: c.athleteId,
        }),
      });
    } catch {
      // Best-effort; continue to local cache for UI.
    }

    addToFavoritesIfMissing(programId, {
      id: c.athleteId,
      displayName: c.displayName,
      eventGroup: c.eventGroup,
      gradYear: c.gradYear,
    });
    window.dispatchEvent(
      new CustomEvent("xc:recruiting:favorites:changed", { detail: { programId } })
    );
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }
  if (err) {
    return <div className="text-sm text-muted-foreground">{err}</div>;
  }
  if (rows.length === 0) {
    return <div className="text-sm text-muted-foreground">No surfaced candidates.</div>;
  }

  return (
    <div className="space-y-2">
      {rows.map((c) => (
        <RecruitingCandidateChip
          key={c.athleteId}
          programId={programId}
          candidate={c}
          onFavorite={() => addToFavorites(c)}
        />
      ))}
    </div>
  );
}
