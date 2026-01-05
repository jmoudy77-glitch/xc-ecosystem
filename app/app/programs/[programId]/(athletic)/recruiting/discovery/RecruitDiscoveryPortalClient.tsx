// app/app/programs/[programId]/(athletic)/recruiting/discovery/RecruitDiscoveryPortalClient.tsx

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  readRecruitDiscoverySurfacedCandidates,
  type RecruitDiscoveryCandidate,
} from "@/app/actions/recruiting/readRecruitDiscoverySurfacedCandidates";
import { type RecruitDiscoveryDnDPayload } from "@/app/lib/recruiting/discoveryDnD";
import {
  readHiddenSurfacedIds,
  favoritesStorageKey,
  safeJsonParse,
} from "@/app/lib/recruiting/discoveryStorage";

type OriginKey = "surfaced" | "favorites";

type Candidate = {
  id: string;
  displayName: string;
  eventGroup?: string | null;
  gradYear?: number | null;
  originKey: OriginKey;
  originMeta: Record<string, unknown>;
};

type Props = {
  programId: string;
};

function normalizeCandidate(raw: any, originKey: OriginKey): Candidate | null {
  const id = typeof raw?.id === "string" && raw.id.trim() ? raw.id.trim() : null;
  const displayName =
    typeof raw?.displayName === "string" && raw.displayName.trim()
      ? raw.displayName.trim()
      : null;

  if (!id || !displayName) return null;

  const eventGroup =
    typeof raw?.eventGroup === "string" && raw.eventGroup.trim()
      ? raw.eventGroup.trim()
      : typeof raw?.event_group === "string" && raw.event_group.trim()
        ? raw.event_group.trim()
        : null;

  const gradYear =
    typeof raw?.gradYear === "number" && Number.isFinite(raw.gradYear)
      ? raw.gradYear
      : typeof raw?.grad_year === "number" && Number.isFinite(raw.grad_year)
        ? raw.grad_year
        : null;

  const originMeta =
    raw?.originMeta && typeof raw.originMeta === "object" ? (raw.originMeta as Record<string, unknown>) : {};

  return {
    id,
    displayName,
    eventGroup,
    gradYear,
    originKey,
    originMeta,
  };
}

function loadFavorites(programId: string): Candidate[] {
  if (typeof window === "undefined") return [];
  const parsed = safeJsonParse<any[]>(window.localStorage.getItem(favoritesStorageKey(programId)));
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((row) => normalizeCandidate(row, "favorites"))
    .filter(Boolean) as Candidate[];
}

function saveFavorites(programId: string, favorites: Candidate[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(favoritesStorageKey(programId), JSON.stringify(favorites));
}

function toDnDPayload(programId: string, c: Candidate): RecruitDiscoveryDnDPayload {
  return {
    kind: "recruit_discovery_candidate",
    programId,

    candidateId: c.id,
    displayName: c.displayName,
    eventGroup: c.eventGroup ?? null,
    gradYear: c.gradYear ?? null,

    originKey: c.originKey,
    originMeta: c.originMeta ?? {},
  };
}

function setDragData(e: React.DragEvent, payload: RecruitDiscoveryDnDPayload) {
  try {
    e.dataTransfer.setData("application/x-xcsys-recruiting", JSON.stringify(payload));
  } catch {
    // no-op
  }
  try {
    e.dataTransfer.setData("text/plain", JSON.stringify(payload));
  } catch {
    // no-op
  }
  e.dataTransfer.effectAllowed = "copy";
}

export default function RecruitDiscoveryPortalClient({ programId }: Props) {
  const [surfaced, setSurfaced] = useState<Candidate[]>([]);
  const [favorites, setFavorites] = useState<Candidate[]>([]);
  const [hiddenSurfacedIds, setHiddenSurfacedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setFavorites(loadFavorites(programId));
    setHiddenSurfacedIds(readHiddenSurfacedIds(programId));
  }, [programId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const rows: RecruitDiscoveryCandidate[] =
        await readRecruitDiscoverySurfacedCandidates({ programId });

      const normalized = (rows ?? [])
        .map((row) => normalizeCandidate(row, "surfaced"))
        .filter((c): c is Candidate => !!c)
        .filter((c) => !hiddenSurfacedIds.has(c.id));

      if (!cancelled) setSurfaced(normalized);
    })();

    return () => {
      cancelled = true;
    };
  }, [programId, hiddenSurfacedIds]);

  const isFav = (candidateId: string) => favorites.some((c) => c.id === candidateId);

  const addFavorite = (c: Candidate) => {
    setFavorites((prev) => {
      if (prev.some((p) => p.id === c.id)) return prev;
      const next = [
        ...prev,
        {
          ...c,
          originKey: "favorites" as OriginKey,
          originMeta: { ...(c.originMeta ?? {}), favoritedAt: new Date().toISOString() },
        },
      ];
      saveFavorites(programId, next);
      return next;
    });
  };

  const removeFavorite = (candidateId: string) => {
    setFavorites((prev) => {
      const next = prev.filter((c) => c.id !== candidateId);
      saveFavorites(programId, next);
      return next;
    });
  };

  const surfacedHeader = useMemo(() => {
    if (surfaced.length === 0) return "No surfaced candidates yet.";
    return `${surfaced.length} surfaced candidate${surfaced.length === 1 ? "" : "s"}.`;
  }, [surfaced.length]);

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">Recruiting</div>
          <h1 className="truncate text-xl font-semibold">Recruit Discovery Portal</h1>
          <div className="text-sm text-muted-foreground">
            Program: <span className="font-mono">{programId}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
            href={`/app/programs/${programId}/recruiting`}
          >
            Back to Stabilization
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <section className="rounded-lg border bg-card">
          <div className="border-b p-3">
            <div className="text-sm font-medium">Surfaced</div>
            <div className="text-xs text-muted-foreground">{surfacedHeader}</div>
          </div>

          <div className="p-3">
            {surfaced.length === 0 ? (
              <div className="text-sm text-muted-foreground">No surfaced candidates found.</div>
            ) : (
              <ul className="space-y-2">
                {surfaced.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                    draggable
                    onDragStart={(e) => setDragData(e, toDnDPayload(programId, c))}
                    title="Drag to Recruiting Stabilization slot"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{c.displayName}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.eventGroup ?? "—"} · {c.gradYear ?? "—"}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                      onClick={() => addFavorite(c)}
                      disabled={isFav(c.id)}
                      title={isFav(c.id) ? "Already in Favorites" : "Add to Favorites"}
                    >
                      {isFav(c.id) ? "Favorited" : "Favorite"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded-lg border bg-card">
          <div className="border-b p-3">
            <div className="text-sm font-medium">Favorites</div>
            <div className="text-xs text-muted-foreground">Coach-curated shortlist (session cache v1).</div>
          </div>

          <div className="p-3">
            {favorites.length === 0 ? (
              <div className="text-sm text-muted-foreground">No favorites yet.</div>
            ) : (
              <ul className="space-y-2">
                {favorites.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                    draggable
                    onDragStart={(e) => setDragData(e, toDnDPayload(programId, c))}
                    title="Drag to Recruiting Stabilization slot"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{c.displayName}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.eventGroup ?? "—"} · {c.gradYear ?? "—"}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                      onClick={() => removeFavorite(c.id)}
                      title="Remove from Favorites"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
