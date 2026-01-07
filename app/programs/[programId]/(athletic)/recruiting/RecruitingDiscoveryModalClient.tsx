// app/programs/[programId]/(athletic)/recruiting/RecruitingDiscoveryModalClient.tsx

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
  const modalRef = React.useRef<HTMLDivElement | null>(null);

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

  React.useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const root = modalRef.current;
      if (!root) return;

      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && active === last) {
        first.focus();
        e.preventDefault();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="glass-pill glass-pill--brand-soft inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-[var(--foreground)] ring-1 ring-panel hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
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
          <div className="absolute inset-0 bg-black/70" onClick={closeWithExport} />

          <div
            ref={modalRef}
            tabIndex={-1}
            className="relative flex w-full max-w-6xl flex-col rounded-2xl ring-1 ring-panel panel shadow-elev-2 max-h-[calc(100vh-2rem)] overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-subtle px-4 py-3">
              <div className="min-w-0">
                <div className="text-[11px] text-muted">Recruiting</div>
                <div className="truncate text-sm font-semibold">Discovery Portal</div>
              </div>

              <button
                type="button"
                className="glass-pill glass-pill--brand-soft rounded-full px-3 py-1.5 text-xs ring-1 ring-panel hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                onClick={closeWithExport}
              >
                Done
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              <RecruitDiscoveryPortalClient programId={programId} sport={sport} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
