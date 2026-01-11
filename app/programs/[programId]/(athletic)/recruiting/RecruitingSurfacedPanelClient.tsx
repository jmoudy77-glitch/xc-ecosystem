"use client";

import * as React from "react";
import { readRecruitingM1View } from "@/app/actions/recruiting/readRecruitingM1View";
import {
  RecruitingCandidateChip,
  type RecruitingPanelCandidate,
} from "./RecruitingCandidateChip";
import {
  addToFavoritesIfMissing,
  readHiddenSurfacedIds,
} from "@/app/lib/recruiting/portalStorage";
import type { M3RecruitImpactSummary } from "./m3/useRecruitingM3UIPayload";

export function RecruitingSurfacedPanelClient({
  programId,
  m3SummariesById,
}: {
  programId: string;
  m3SummariesById?: Record<string, M3RecruitImpactSummary> | null;
}) {
  const [rows, setRows] = React.useState<RecruitingPanelCandidate[]>([]);
  const [hiddenIds, setHiddenIds] = React.useState<Set<string>>(new Set());
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

  React.useEffect(() => {
    setHiddenIds(readHiddenSurfacedIds(programId));
  }, [programId]);

  React.useEffect(() => {
    const handler = (e: any) => {
      if (e?.detail?.programId && e.detail.programId !== programId) return;
      setHiddenIds(readHiddenSurfacedIds(programId));
    };
    window.addEventListener("xc:recruiting:surfaced:changed" as any, handler);
    return () => window.removeEventListener("xc:recruiting:surfaced:changed" as any, handler);
  }, [programId]);

  const visibleRows = React.useMemo(
    () => rows.filter((r) => !hiddenIds.has(r.athleteId)),
    [hiddenIds, rows]
  );

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
    return (
      <div className="rounded-xl ring-1 ring-panel panel-muted px-3 py-3">
        <div className="text-sm font-medium">Loading surfaced</div>
        <div className="mt-1 text-[11px] text-muted">Fetching engine-curated candidates…</div>
      </div>
    );
  }
  if (err) {
    return (
      <div className="rounded-xl ring-1 ring-panel panel-muted px-3 py-3">
        <div className="text-sm font-medium">Unable to load surfaced</div>
        <div className="mt-1 text-[11px] text-muted">{err}</div>
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="rounded-xl ring-1 ring-panel panel-muted px-3 py-3">
        <div className="text-sm font-medium">No surfaced candidates</div>
        <div className="mt-1 text-[11px] text-muted">
          Surfaced candidates appear here when the engine curates a cohort.
        </div>
      </div>
    );
  }
  if (visibleRows.length === 0) {
    return (
      <div className="rounded-xl ring-1 ring-panel panel-muted px-3 py-3">
        <div className="text-sm font-medium">No surfaced candidates</div>
        <div className="mt-1 text-[11px] text-muted">
          All surfaced candidates are currently hidden.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0">
      <div className="space-y-2">
        {visibleRows.map((c) => (
          <RecruitingCandidateChip
            key={c.athleteId}
            programId={programId}
            candidate={c}
            onFavorite={() => addToFavorites(c)}
            m3Summary={m3SummariesById?.[c.athleteId] ?? null}
          />
        ))}
      </div>
    </div>
  );
}
