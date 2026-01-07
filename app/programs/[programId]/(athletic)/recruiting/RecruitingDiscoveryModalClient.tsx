"use client";

import * as React from "react";
import RecruitDiscoveryPortalClient from "./RecruitDiscoveryPortalClient";
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

    const favorites = safeJsonParse<any[]>(window.localStorage.getItem(favoritesStorageKey(programId)));
    if (!Array.isArray(favorites) || favorites.length === 0) return;

    const order = readFavoritesOrder(programId);
    const idsInFavorites = favorites
      .map((r) => (typeof r?.id === "string" ? r.id : null))
      .filter((v): v is string => !!v);

    const ordered =
      Array.isArray(order) && order.length > 0
        ? order.filter((id) => idsInFavorites.includes(id))
        : [];

    const remaining = idsInFavorites.filter((id) => !ordered.includes(id));
    const finalIds = [...ordered, ...remaining];

    for (let i = 0; i < finalIds.length; i++) {
      const athleteId = finalIds[i];
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
        className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
        onClick={() => setOpen(true)}
      >
        Discovery Portal
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Recruiting Discovery Portal"
        >
          <div className="absolute inset-0 bg-black/60" onClick={closeWithExport} />

          <div className="relative flex w-full max-w-6xl flex-col rounded-xl border border-white/10 bg-black/80 shadow-2xl max-h-[calc(100vh-2rem)]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="min-w-0">
                <div className="text-xs text-white/50">Recruiting</div>
                <div className="truncate text-sm font-semibold text-white/90">Discovery Portal</div>
              </div>

              <button
                type="button"
                className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                onClick={closeWithExport}
              >
                Done
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-auto">
              <RecruitDiscoveryPortalClient programId={programId} sport={sport} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
