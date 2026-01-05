// app/programs/[programId]/(athletic)/recruiting/RecruitDiscoveryPortalClient.tsx

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  readRecruitDiscoverySurfacedCandidates,
  type RecruitDiscoveryCandidate,
} from "@/app/actions/recruiting/readRecruitDiscoverySurfacedCandidates";
import { type RecruitDiscoveryDnDPayload } from "@/app/lib/recruiting/portalDnD";
import {
  readHiddenSurfacedIds,
  favoritesStorageKey,
  safeJsonParse,
  hideSurfacedCandidate,
  clearHiddenSurfaced,
  readFavoritesOrder,
  writeFavoritesOrder,
  clearFavoritesOrder,
} from "@/app/lib/recruiting/portalStorage";

type OriginKey = "surfaced" | "favorites";

type SortKey = "fit" | "name" | "gradYear";

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

function norm(s: string) {
  return s.trim().toLowerCase();
}

function candidateFitScore(c: Candidate): number {
  // Non-authoritative: attempt to surface a stable numeric signal if present.
  // Accept common keys; otherwise default to 0.
  const m = c.originMeta ?? {};
  const v =
    (typeof (m as any).fit_score === "number" && (m as any).fit_score) ||
    (typeof (m as any).fitScore === "number" && (m as any).fitScore) ||
    (typeof (m as any).commit_probability === "number" && (m as any).commit_probability) ||
    (typeof (m as any).commitProbability === "number" && (m as any).commitProbability) ||
    (typeof (m as any).score === "number" && (m as any).score) ||
    0;
  return Number.isFinite(v) ? v : 0;
}

function candidateCues(c: Candidate): { label: string; value: string }[] {
  const cues: { label: string; value: string }[] = [];
  const m = c.originMeta ?? {};

  // Fit (if present)
  const fit = candidateFitScore(c);
  if (fit > 0) cues.push({ label: "Fit", value: String(Math.round(fit)) });

  // Source (origin)
  cues.push({
    label: "Source",
    value: c.originKey === "surfaced" ? "Surfaced" : "Favorite",
  });

  // Optional: state / school if present in meta
  const state =
    (typeof (m as any).state === "string" && (m as any).state.trim()) ||
    (typeof (m as any).home_state === "string" && (m as any).home_state.trim()) ||
    null;
  if (state) cues.push({ label: "State", value: state });

  const school =
    (typeof (m as any).school === "string" && (m as any).school.trim()) ||
    (typeof (m as any).hs_name === "string" && (m as any).hs_name.trim()) ||
    null;
  if (school) cues.push({ label: "School", value: school });

  return cues;
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
  const [favoritesOrder, setFavoritesOrder] = useState<string[]>([]);
  const [hiddenSurfacedIds, setHiddenSurfacedIds] = useState<Set<string>>(new Set());

  // Controls
  const [q, setQ] = useState("");
  const [eventGroupFilter, setEventGroupFilter] = useState<string>("all");
  const [gradYearFilter, setGradYearFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("fit");

  const activeFilterSummary = useMemo(() => {
    const parts: string[] = [];
    if (q.trim()) parts.push(`Search: "${q.trim()}"`);
    if (eventGroupFilter !== "all") parts.push(`Event: ${eventGroupFilter}`);
    if (gradYearFilter !== "all") parts.push(`Grad: ${gradYearFilter}`);
    if (parts.length === 0) return "No filters applied.";
    return parts.join(" · ");
  }, [q, eventGroupFilter, gradYearFilter]);

  const resetFilters = () => {
    setQ("");
    setEventGroupFilter("all");
    setGradYearFilter("all");
    setSortKey("fit");
  };

  useEffect(() => {
    setFavorites(loadFavorites(programId));
    setHiddenSurfacedIds(readHiddenSurfacedIds(programId));
    setFavoritesOrder(readFavoritesOrder(programId));
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

  const hideFromSurfaced = (candidateId: string) => {
    hideSurfacedCandidate(programId, candidateId);
    setHiddenSurfacedIds(readHiddenSurfacedIds(programId));
  };

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
    setFavoritesOrder((prev) => {
      const next = [c.id, ...prev.filter((id) => id !== c.id)];
      writeFavoritesOrder(programId, next);
      return next;
    });
  };

  const removeFavorite = (candidateId: string) => {
    setFavorites((prev) => {
      const next = prev.filter((c) => c.id !== candidateId);
      saveFavorites(programId, next);
      return next;
    });
    setFavoritesOrder((prev) => {
      const next = prev.filter((id) => id !== candidateId);
      writeFavoritesOrder(programId, next);
      return next;
    });
  };

  const surfacedHeader = useMemo(() => {
    if (surfaced.length === 0) return "No surfaced candidates yet.";
    return `${surfaced.length} surfaced candidate${surfaced.length === 1 ? "" : "s"}.`;
  }, [surfaced.length]);

  const allEventGroups = useMemo(() => {
    const s = new Set<string>();
    for (const c of surfaced) if (c.eventGroup) s.add(c.eventGroup);
    for (const c of favorites) if (c.eventGroup) s.add(c.eventGroup);
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [surfaced, favorites]);

  const allGradYears = useMemo(() => {
    const s = new Set<number>();
    for (const c of surfaced) if (typeof c.gradYear === "number") s.add(c.gradYear);
    for (const c of favorites) if (typeof c.gradYear === "number") s.add(c.gradYear);
    return Array.from(s).sort((a, b) => a - b);
  }, [surfaced, favorites]);

  const filteredSurfaced = useMemo(() => {
    const query = norm(q);
    let rows = surfaced.slice();

    if (query) {
      rows = rows.filter((c) => {
        const m = c.originMeta ?? {};
        const school =
          (typeof (m as any).school === "string" && (m as any).school) ||
          (typeof (m as any).hs_name === "string" && (m as any).hs_name) ||
          "";
        const state =
          (typeof (m as any).state === "string" && (m as any).state) ||
          (typeof (m as any).home_state === "string" && (m as any).home_state) ||
          "";
        const hay = norm(
          `${c.displayName} ${c.eventGroup ?? ""} ${c.gradYear ?? ""} ${school} ${state}`
        );
        return hay.includes(query);
      });
    }

    if (eventGroupFilter !== "all") {
      rows = rows.filter((c) => (c.eventGroup ?? "—") === eventGroupFilter);
    }
    if (gradYearFilter !== "all") {
      const gy = Number(gradYearFilter);
      rows = rows.filter((c) => c.gradYear === gy);
    }

    rows.sort((a, b) => {
      if (sortKey === "name") return a.displayName.localeCompare(b.displayName);
      if (sortKey === "gradYear") return (a.gradYear ?? 9999) - (b.gradYear ?? 9999);
      // fit (descending)
      return candidateFitScore(b) - candidateFitScore(a);
    });

    return rows;
  }, [surfaced, q, eventGroupFilter, gradYearFilter, sortKey]);

  const filteredFavorites = useMemo(() => {
    const query = norm(q);
    let rows = favorites.slice();

    if (query) {
      rows = rows.filter((c) => {
        const m = c.originMeta ?? {};
        const school =
          (typeof (m as any).school === "string" && (m as any).school) ||
          (typeof (m as any).hs_name === "string" && (m as any).hs_name) ||
          "";
        const state =
          (typeof (m as any).state === "string" && (m as any).state) ||
          (typeof (m as any).home_state === "string" && (m as any).home_state) ||
          "";
        const hay = norm(
          `${c.displayName} ${c.eventGroup ?? ""} ${c.gradYear ?? ""} ${school} ${state}`
        );
        return hay.includes(query);
      });
    }

    if (eventGroupFilter !== "all") {
      rows = rows.filter((c) => (c.eventGroup ?? "—") === eventGroupFilter);
    }
    if (gradYearFilter !== "all") {
      const gy = Number(gradYearFilter);
      rows = rows.filter((c) => c.gradYear === gy);
    }

    const orderIndex = new Map<string, number>();
    for (let i = 0; i < favoritesOrder.length; i++) orderIndex.set(favoritesOrder[i], i);

    rows.sort((a, b) => {
      const ia = orderIndex.has(a.id) ? orderIndex.get(a.id)! : 1e9;
      const ib = orderIndex.has(b.id) ? orderIndex.get(b.id)! : 1e9;
      if (ia !== ib) return ia - ib;

      if (sortKey === "name") return a.displayName.localeCompare(b.displayName);
      if (sortKey === "gradYear") return (a.gradYear ?? 9999) - (b.gradYear ?? 9999);
      return candidateFitScore(b) - candidateFitScore(a);
    });

    return rows;
  }, [favorites, favoritesOrder, q, eventGroupFilter, gradYearFilter, sortKey]);

  const pinFavoriteToTop = (candidateId: string) => {
    setFavoritesOrder((prev) => {
      const next = [candidateId, ...prev.filter((id) => id !== candidateId)];
      writeFavoritesOrder(programId, next);
      return next;
    });
  };

  const moveFavorite = (candidateId: string, dir: "up" | "down") => {
    setFavoritesOrder((prev) => {
      const ids = prev.slice();
      const idx = ids.indexOf(candidateId);
      if (idx === -1) {
        const next = [candidateId, ...ids];
        writeFavoritesOrder(programId, next);
        return next;
      }
      const swapWith = dir === "up" ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= ids.length) return ids;
      const tmp = ids[swapWith];
      ids[swapWith] = ids[idx];
      ids[idx] = tmp;
      writeFavoritesOrder(programId, ids);
      return ids;
    });
  };

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

      {/* Controls (minimal-touch, single row) */}
      <div className="mb-3 rounded-lg border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-md border bg-background px-3 py-2">
            <div className="text-xs text-muted-foreground">Search</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, school, state, event group…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground">Event</div>
            <select
              value={eventGroupFilter}
              onChange={(e) => setEventGroupFilter(e.target.value)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              <option value="all">All</option>
              {allEventGroups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground">Grad</div>
            <select
              value={gradYearFilter}
              onChange={(e) => setGradYearFilter(e.target.value)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              <option value="all">All</option>
              {allGradYears.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground">Sort</div>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              <option value="fit">Fit</option>
              <option value="name">Name</option>
              <option value="gradYear">Grad Year</option>
            </select>
          </div>

          <button
            type="button"
            className="h-9 rounded-md border px-3 text-sm hover:bg-muted"
            onClick={resetFilters}
            title="Reset filters"
          >
            Reset
          </button>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">{activeFilterSummary}</div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <section className="rounded-lg border bg-card">
          <div className="border-b p-3">
            <div className="text-sm font-medium">Surfaced</div>
            <div className="text-xs text-muted-foreground">
              {filteredSurfaced.length === surfaced.length
                ? surfacedHeader
                : `${filteredSurfaced.length} of ${surfaced.length} surfaced (filtered).`}
            </div>
          </div>

          <div className="p-3">
            {surfaced.length === 0 ? (
              <div className="text-sm text-muted-foreground">No surfaced candidates found.</div>
            ) : (
              <>
                {filteredSurfaced.length === 0 ? (
                  <div className="rounded-md border bg-muted/20 px-3 py-3">
                    <div className="text-sm font-medium">No matches in Surfaced</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Filters removed all surfaced candidates. Reset filters to widen results.
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
                        onClick={resetFilters}
                      >
                        Reset filters
                      </button>
                      <div className="text-xs text-muted-foreground">{activeFilterSummary}</div>
                    </div>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {filteredSurfaced.map((c) => (
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
                          <div className="mt-1 flex flex-wrap gap-1">
                            {candidateCues(c)
                              .slice(0, 3)
                              .map((cue) => (
                                <span
                                  key={cue.label}
                                  className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground"
                                  title={`${cue.label}: ${cue.value}`}
                                >
                                  <span className="opacity-70">{cue.label}</span>
                                  <span className="font-mono">{cue.value}</span>
                                </span>
                              ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                            onClick={() => addFavorite(c)}
                            disabled={isFav(c.id)}
                            title={isFav(c.id) ? "Already in Favorites" : "Add to Favorites"}
                          >
                            {isFav(c.id) ? "Favorited" : "Favorite"}
                          </button>

                          <button
                            type="button"
                            className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                            onClick={() => hideFromSurfaced(c.id)}
                            title="Hide from Surfaced list (local)"
                          >
                            Hide
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {hiddenSurfacedIds.size > 0 && (
              <div className="mt-3 flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2">
                <div className="text-xs text-muted-foreground">
                  Hidden from Surfaced (local):{" "}
                  <span className="font-mono">{hiddenSurfacedIds.size}</span>
                </div>
                <button
                  type="button"
                  className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                  onClick={() => {
                    clearHiddenSurfaced(programId);
                    setHiddenSurfacedIds(new Set());
                  }}
                  title="Show hidden surfaced candidates again"
                >
                  Show hidden
                </button>
              </div>
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
              <>
                {filteredFavorites.length === 0 ? (
                  <div className="rounded-md border bg-muted/20 px-3 py-3">
                    <div className="text-sm font-medium">No matches in Favorites</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Filters removed all favorites. Reset filters to widen results.
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
                        onClick={resetFilters}
                      >
                        Reset filters
                      </button>
                      <div className="text-xs text-muted-foreground">{activeFilterSummary}</div>
                    </div>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {filteredFavorites.map((c) => (
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
                          <div className="mt-1 flex flex-wrap gap-1">
                            {candidateCues(c)
                              .slice(0, 3)
                              .map((cue) => (
                                <span
                                  key={cue.label}
                                  className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground"
                                  title={`${cue.label}: ${cue.value}`}
                                >
                                  <span className="opacity-70">{cue.label}</span>
                                  <span className="font-mono">{cue.value}</span>
                                </span>
                              ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                            onClick={() => pinFavoriteToTop(c.id)}
                            title="Pin to top"
                          >
                            Pin
                          </button>
                          <button
                            type="button"
                            className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                            onClick={() => moveFavorite(c.id, "up")}
                            title="Move up"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                            onClick={() => moveFavorite(c.id, "down")}
                            title="Move down"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                            onClick={() => removeFavorite(c.id)}
                            title="Remove from Favorites"
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {favorites.length > 0 && (
              <div className="mt-3 flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2">
                <div className="text-xs text-muted-foreground">Order is local to this device.</div>
                <button
                  type="button"
                  className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                  onClick={() => {
                    clearFavoritesOrder(programId);
                    setFavoritesOrder([]);
                  }}
                  title="Reset favorite ordering"
                >
                  Reset order
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
