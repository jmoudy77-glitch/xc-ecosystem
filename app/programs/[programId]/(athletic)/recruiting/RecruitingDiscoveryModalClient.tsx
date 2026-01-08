// app/programs/[programId]/(athletic)/recruiting/RecruitingDiscoveryModalClient.tsx

"use client";

import * as React from "react";
import RecruitDiscoveryPortalClient from "./RecruitDiscoveryPortalClient";
import { GlassModalShell } from "@/components/ui/GlassModalShell";
import {
  favoritesStorageKey,
  safeJsonParse,
  readFavoritesOrder,
} from "@/app/lib/recruiting/portalStorage";

type Props = {
  programId: string;
  sport?: string;
};

export default function RecruitingDiscoveryModalClient({ programId, sport = "xc" }: Props) {
  const [open, setOpen] = React.useState(false);

  const exportFavoritesToStabilization = React.useCallback(async () => {
    if (typeof window === "undefined") return;

    const favoritesRaw = safeJsonParse<any[]>(
      window.localStorage.getItem(favoritesStorageKey(programId))
    );
    if (!Array.isArray(favoritesRaw) || favoritesRaw.length === 0) return;

    // De-dupe by athleteId (first occurrence wins).
    const seen = new Set<string>();
    const favorites = favoritesRaw.filter((r) => {
      if (typeof r?.id !== "string") return false;
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    const order = readFavoritesOrder(programId) ?? [];
    const idsInFavorites = favorites.map((r) => r.id);

    // Stable order: explicit order first, then remaining in insertion order.
    const ordered = order.filter((id) => idsInFavorites.includes(id));
    const remaining = idsInFavorites.filter((id) => !ordered.includes(id));
    const finalIds = [...ordered, ...remaining];

    for (let i = 0; i < finalIds.length; i++) {
      const athleteId = finalIds[i];
      // Idempotent write: backend enforces uniqueness per (program, athlete).
      await fetch("/api/recruiting/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId,
          sport,
          athleteId,
          position: i + 1,
          pinned: false,
        }),
      });
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("xc:recruiting:favorites:changed", { detail: { programId } })
      );
    }
  }, [programId, sport]);

  const closeWithExport = React.useCallback(async () => {
    try {
      await exportFavoritesToStabilization();
    } catch {
      // Best-effort export on close.
    } finally {
      setOpen(false);
    }
  }, [exportFavoritesToStabilization]);

  return (
    <>
      <button
        type="button"
        className="glass-pill glass-pill--brand-soft inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-[var(--foreground)] ring-1 ring-panel hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
        onClick={() => setOpen(true)}
      >
        Recruiting Portal
      </button>

      <GlassModalShell
        open={open}
        onClose={closeWithExport}
        maxWidthClassName="max-w-6xl"
        heightClassName="h-[calc(100vh-2rem)]"
        header={
          <div className="border-b border-subtle px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[11px] text-muted truncate">
                  Dashboard <span className="mx-1 text-subtle">›</span> Recruiting{" "}
                  <span className="mx-1 text-subtle">›</span> Discovery
                </div>
                <div className="mt-1 truncate text-base font-semibold">Recruiting Portal</div>
                <div className="mt-1 text-[11px] text-muted">
                  Search eligible recruits, curate a shortlist, export favorites on close.
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end text-[11px] text-muted">
                  <div className="truncate">
                    Program: <span className="text-subtle font-mono">{programId}</span>
                  </div>
                  <div className="truncate">
                    Sport: <span className="text-subtle">{sport}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="glass-pill glass-pill--brand-soft rounded-full px-3 py-1.5 text-xs ring-1 ring-panel hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                  onClick={closeWithExport}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        }
      >
        <div className="h-full min-h-0 overflow-hidden">
          <div className="h-full min-h-0 overflow-auto p-3">
            <RecruitDiscoveryPortalClient programId={programId} sport={sport} />
          </div>
        </div>
      </GlassModalShell>
    </>
  );
}
