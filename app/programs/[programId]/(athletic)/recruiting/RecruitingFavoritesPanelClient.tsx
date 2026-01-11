"use client";

import * as React from "react";
import {
  RecruitingCandidateChip,
  type RecruitingPanelCandidate,
} from "./RecruitingCandidateChip";
import { type StabilizationFavorite } from "./_helpers/stabilizationFavorites";
import { readFavorites, removeFromFavorites } from "@/app/lib/recruiting/portalStorage";
import type { M3RecruitImpactSummary } from "./m3/useRecruitingM3UIPayload";

export function RecruitingFavoritesPanelClient({
  programId,
  m3SummariesById,
}: {
  programId: string;
  m3SummariesById?: Record<string, M3RecruitImpactSummary> | null;
}) {
  const [rows, setRows] = React.useState<StabilizationFavorite[]>([]);

  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch("/api/recruiting/favorites/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId, sport: "xc" }),
      });
      if (!res.ok) return;
      const json = await res.json();
      if (!json?.ok || !Array.isArray(json.data)) return;

      const local = readFavorites(programId);
      const byId = new Map<string, any>(
        local
          .map((c: any) => {
            const id = String(c?.id ?? c?.athleteId ?? c?.athlete_id ?? "").trim();
            return id ? [id, c] : null;
          })
          .filter(Boolean) as Array<[string, any]>
      );

      const mapped = json.data.map((row: any) => {
        const id = String(row?.athlete_id ?? "").trim();
        const localRow = byId.get(id);
        const displayName = String(
          localRow?.displayName ?? localRow?.display_name ?? localRow?.name ?? ""
        ).trim();
        const fallbackLabel = id ? `Athlete ${id.slice(0, 8)}` : "Athlete";
        return {
          athleteId: id,
          displayName: displayName || fallbackLabel,
          eventGroup: (localRow?.eventGroup ?? localRow?.event_group ?? null) as any,
          gradYear:
            (typeof localRow?.gradYear === "number" ? localRow.gradYear :
            typeof localRow?.grad_year === "number" ? localRow.grad_year : null) as any,
          originKey: "favorites",
          originMeta: { ...((localRow?.originMeta ?? {}) as any), pinned: row?.pinned ?? false },
        } as StabilizationFavorite;
      });

      setRows(mapped);
    } catch {
      // Best-effort; keep existing rows on failure.
    }
  }, [programId]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  React.useEffect(() => {
    const handler = (e: any) => {
      if (e?.detail?.programId && e.detail.programId !== programId) return;
      refresh();
    };
    window.addEventListener("xc:recruiting:favorites:changed" as any, handler);
    return () => window.removeEventListener("xc:recruiting:favorites:changed" as any, handler);
  }, [programId, refresh]);

  const remove = async (athleteId: string) => {
    try {
      await fetch("/api/recruiting/favorites/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId, sport: "xc", athleteId }),
      });
    } catch {
      // ignore: best-effort
    }

    removeFromFavorites(programId, athleteId);
    await refresh();
    window.dispatchEvent(
      new CustomEvent("xc:recruiting:favorites:changed", { detail: { programId } })
    );
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-xl ring-1 ring-panel panel-muted px-3 py-3">
        <div className="text-sm font-medium">No favorites yet</div>
        <div className="mt-1 text-[11px] text-muted">
          Favorites appear here after they are added in Stabilization.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0">
      <div className="space-y-2">
        {rows.map((c) => (
          <RecruitingCandidateChip
            key={c.athleteId}
            programId={programId}
            candidate={
              {
                athleteId: c.athleteId,
                displayName: c.displayName,
                eventGroup: c.eventGroup,
                gradYear: c.gradYear,
                originKey: "favorites",
                originMeta: c.originMeta ?? {},
              } as RecruitingPanelCandidate
            }
            onRemoveFavorite={() => remove(c.athleteId)}
            m3Summary={m3SummariesById?.[c.athleteId] ?? null}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl ring-1 ring-panel panel-muted px-3 py-2">
        <div className="text-[11px] text-muted">Order follows Stabilization favorites.</div>
        <button
          type="button"
          className="glass-pill rounded-full px-2.5 py-1 text-[11px] ring-1 ring-panel hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] disabled:opacity-60"
          disabled
          title="Ordering is managed by Stabilization"
          aria-disabled="true"
        >
          Reset order
        </button>
      </div>
    </div>
  );
}
