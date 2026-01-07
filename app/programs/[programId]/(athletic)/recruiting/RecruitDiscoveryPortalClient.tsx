// app/programs/[programId]/(athletic)/recruiting/RecruitDiscoveryPortalClient.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { type RecruitDiscoveryCandidate } from "@/app/actions/recruiting/readRecruitDiscoverySurfacedCandidates";
import {
  safeJsonParse,
  readFavoritesOrder,
  writeFavoritesOrder,
  clearFavoritesOrder,
  favoritesStorageKey,
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
  sport: string;
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

export default function RecruitDiscoveryPortalClient({ programId, sport }: Props) {
  void sport;
  const [surfaced, setSurfaced] = useState<Candidate[]>([]);
  const [favorites, setFavorites] = useState<Candidate[]>([]);
  const [favoritesOrder, setFavoritesOrder] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeList, setActiveList] = useState<"results" | "favorites">("results");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);
  const rowRefs = useRef<Record<string, HTMLElement | null>>({});

  // Controls
  const [q, setQ] = useState("");
  const [eventGroupFilter, setEventGroupFilter] = useState<string>("all");
  const [gradYearFilter, setGradYearFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("fit");
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [filterEventGroups, setFilterEventGroups] = useState<string[]>([]);
  const [filterGradYears, setFilterGradYears] = useState<number[]>([]);

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
    setFavoritesOrder(readFavoritesOrder(programId));
  }, [programId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/recruiting/discovery/filters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ programId, sport }),
        });
        const json = await res.json();
        if (!cancelled && res.ok) {
          setFilterEventGroups(Array.isArray(json?.eventGroups) ? json.eventGroups : []);
          setFilterGradYears(Array.isArray(json?.gradYears) ? json.gradYears : []);
        }
      } catch {
        // Best-effort filters.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [programId, sport]);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const runSearch = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsSearching(true);
    setHasSearched(true);
    try {
      const gradYear =
        gradYearFilter === "all" ? null : Number.isFinite(Number(gradYearFilter)) ? Number(gradYearFilter) : null;
      const res = await fetch("/api/recruiting/discovery/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId,
          sport,
          q: q.trim() ? q.trim() : null,
          eventGroup: eventGroupFilter,
          gradYear,
          limit: 100,
          offset: 0,
        }),
        signal: controller.signal,
      });
      const json = await res.json();
      if (!res.ok) {
        setSurfaced([]);
      } else {
        const normalized = (json?.rows ?? [])
          .map((row: RecruitDiscoveryCandidate) => normalizeCandidate(row, "surfaced"))
          .filter((c): c is Candidate => !!c);
        setSurfaced(normalized);
        if (normalized.length > 0 && !selectedId) setSelectedId(normalized[0].id);
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setSurfaced([]);
      }
    } finally {
      if (abortRef.current === controller) {
        setIsSearching(false);
      }
    }
  };

  const clearSearch = () => {
    setQ("");
    setEventGroupFilter("all");
    setGradYearFilter("all");
    setSurfaced([]);
    setHasSearched(false);
    setSelectedId(null);
  };

  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onClear: () => void }> = [];
    const qv = q.trim();
    if (qv) {
      chips.push({
        key: "q",
        label: `Query: ${qv}`,
        onClear: () => setQ(""),
      });
    }
    if (eventGroupFilter !== "all") {
      chips.push({
        key: "eg",
        label: `Event: ${eventGroupFilter}`,
        onClear: () => setEventGroupFilter("all"),
      });
    }
    if (gradYearFilter !== "all") {
      chips.push({
        key: "gy",
        label: `Grad: ${gradYearFilter}`,
        onClear: () => setGradYearFilter("all"),
      });
    }
    return chips;
  }, [q, eventGroupFilter, gradYearFilter]);

  // After the first explicit search, keep results synced to filter changes.
  useEffect(() => {
    if (!hasSearched) return;
    void runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventGroupFilter, gradYearFilter, hasSearched]);

  // Debounce typing after the first explicit search.
  useEffect(() => {
    if (!hasSearched) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      runSearch();
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, hasSearched]);

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
    if (filterEventGroups.length > 0) return filterEventGroups;
    const s = new Set<string>();
    for (const c of surfaced) if (c.eventGroup) s.add(c.eventGroup);
    for (const c of favorites) if (c.eventGroup) s.add(c.eventGroup);
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [filterEventGroups, surfaced, favorites]);

  const allGradYears = useMemo(() => {
    if (filterGradYears.length > 0) return filterGradYears;
    const s = new Set<number>();
    for (const c of surfaced) if (typeof c.gradYear === "number") s.add(c.gradYear);
    for (const c of favorites) if (typeof c.gradYear === "number") s.add(c.gradYear);
    return Array.from(s).sort((a, b) => a - b);
  }, [filterGradYears, surfaced, favorites]);

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

  const resultIds = useMemo(() => filteredSurfaced.map((c) => c.id), [filteredSurfaced]);
  const favoriteIds = useMemo(() => filteredFavorites.map((c) => c.id), [filteredFavorites]);

  const scrollToId = (id: string) => {
    const el = rowRefs.current[id];
    if (!el) return;
    try {
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
    } catch {
      // Best-effort.
    }
  };

  useEffect(() => {
    if (!selectedId) return;
    const exists = resultIds.includes(selectedId) || favoriteIds.includes(selectedId);
    if (!exists) {
      setSelectedId(null);
      return;
    }
    scrollToId(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultIds, favoriteIds]);

  useEffect(() => {
    const isTypingTarget = (t: EventTarget | null) => {
      if (!t || !(t as any).tagName) return false;
      const el = t as HTMLElement;
      const tag = el.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return true;
      if ((el as any).isContentEditable) return true;
      return false;
    };

    const moveWithin = (dir: -1 | 1) => {
      const ids = activeList === "results" ? resultIds : favoriteIds;
      if (ids.length === 0) return;
      const current = selectedId && ids.includes(selectedId) ? selectedId : null;
      const idx = current ? ids.indexOf(current) : -1;
      const nextIdx =
        idx === -1
          ? dir === 1
            ? 0
            : ids.length - 1
          : Math.min(Math.max(idx + dir, 0), ids.length - 1);
      const nextId = ids[nextIdx];
      setSelectedId(nextId);
      scrollToId(nextId);
    };

    const switchList = (next: "results" | "favorites") => {
      if (next === activeList) return;
      setActiveList(next);
      const ids = next === "results" ? resultIds : favoriteIds;
      if (ids.length === 0) return;
      const fallback = selectedId && ids.includes(selectedId) ? selectedId : ids[0];
      setSelectedId(fallback);
      scrollToId(fallback);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        moveWithin(1);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        moveWithin(-1);
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        switchList("results");
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        switchList("favorites");
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSelectedId(null);
        return;
      }
      if (e.key === "Enter") {
        if (selectedId) {
          e.preventDefault();
          scrollToId(selectedId);
        }
        return;
      }
      if (e.key === "a" || e.key === "A") {
        if (!selectedId) return;
        e.preventDefault();
        const inFav = isFav(selectedId);
        const candidate =
          favorites.find((c) => c.id === selectedId) ??
          surfaced.find((c) => c.id === selectedId) ??
          null;
        if (!candidate) return;
        if (inFav) {
          removeFavorite(selectedId);
        } else {
          addFavorite(candidate);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeList, resultIds, favoriteIds, selectedId, favorites, surfaced]);

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

  const selected = useMemo(() => {
    if (!selectedId) return null;
    const inSurfaced = surfaced.find((c) => c.id === selectedId) ?? null;
    const inFav = favorites.find((c) => c.id === selectedId) ?? null;
    return inFav ?? inSurfaced;
  }, [favorites, surfaced, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const stillExists = surfaced.some((c) => c.id === selectedId) || favorites.some((c) => c.id === selectedId);
    if (!stillExists) setSelectedId(null);
  }, [favorites, selectedId, surfaced]);

  return (
    <div className="h-full w-full p-3 min-h-0">
      <div
        className="grid h-full min-h-0 gap-3"
        style={{
          // Use fr ratios with minmax(0, …) to prevent rounding overflow/clipping.
          // 30/40/30 => 3fr/4fr/3fr
          // 20/80 => 1fr/4fr
          gridTemplateColumns: "minmax(0, 3fr) minmax(0, 4fr) minmax(0, 3fr)",
          gridTemplateRows: "minmax(0, 1fr) minmax(0, 4fr)",
        }}
      >
        <section className="col-span-2 row-span-1 rounded-lg border bg-card p-3 min-h-0 overflow-hidden">
          <div className="flex h-full flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-md border bg-background px-3 py-2">
                <div className="text-xs text-muted-foreground">Search</div>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") runSearch();
                  }}
                  placeholder="Name, school, state, event group…"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                  ref={searchInputRef}
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

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="h-9 rounded-md border px-3 text-sm hover:bg-muted disabled:opacity-60"
                  onClick={runSearch}
                  disabled={isSearching}
                  title="Search"
                  aria-disabled={isSearching}
                >
                  {isSearching ? "Searching…" : "Search"}
                </button>
                <button
                  type="button"
                  className="h-9 rounded-md border px-3 text-sm hover:bg-muted"
                  onClick={clearSearch}
                  title="Clear search and filters"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">{activeFilterSummary}</div>

            {activeChips.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {activeChips.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    className="rounded-full border px-2 py-1 text-xs"
                    onClick={c.onClear}
                    aria-label={`Clear ${c.label}`}
                  >
                    {c.label} <span className="ml-1 text-muted-foreground">×</span>
                  </button>
                ))}
                <button
                  type="button"
                  className="rounded-full border px-2 py-1 text-xs"
                  onClick={clearSearch}
                >
                  Reset all
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <section className="col-span-1 row-span-2 rounded-lg border bg-card flex flex-col min-h-0">
          <div className="border-b p-3">
            <div className="text-sm font-medium">Favorites</div>
            <div className="text-xs text-muted-foreground">Discovery-local shortlist. Exports on close.</div>
          </div>

          <div className="min-h-0 overflow-auto p-3">
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
                        ref={(el) => {
                          rowRefs.current[c.id] = el;
                        }}
                        className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                          selectedId === c.id ? "bg-muted/20" : ""
                        }`}
                      >
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => {
                            setSelectedId(c.id);
                            setActiveList("favorites");
                          }}
                          title="Select athlete"
                        >
                          <div className="truncate text-sm font-medium">{c.displayName}</div>
                          <div className="text-xs text-muted-foreground">
                            {c.eventGroup ?? "—"} · {c.gradYear ?? "—"}
                          </div>
                        </button>

                        <div className="ml-2 flex items-center gap-1">
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

        <section className="col-span-1 row-span-1 rounded-lg border bg-card flex flex-col min-h-0">
          <div className="border-b p-3">
            <div className="text-sm font-medium">Results</div>
            <div className="text-xs text-muted-foreground">
              {!hasSearched
                ? "Empty until Search is run."
                : filteredSurfaced.length === surfaced.length
                  ? surfacedHeader
                  : `${filteredSurfaced.length} of ${surfaced.length} results (filtered).`}
            </div>
          </div>

          <div className="min-h-0 overflow-auto p-3">
            {!hasSearched ? (
              <div className="text-sm text-muted-foreground">Run a search to populate results.</div>
            ) : isSearching ? (
              <div className="text-sm text-muted-foreground">Searching…</div>
            ) : surfaced.length === 0 ? (
              <div className="text-sm text-muted-foreground">No matches for the current query or filters.</div>
            ) : filteredSurfaced.length === 0 ? (
              <div className="rounded-md border bg-muted/20 px-3 py-3">
                <div className="text-sm font-medium">No matches</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Filters removed all results. Reset filters to widen results.
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
                    ref={(el) => {
                      rowRefs.current[c.id] = el;
                    }}
                    className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                      selectedId === c.id ? "bg-muted/20" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => {
                        setSelectedId(c.id);
                        setActiveList("results");
                      }}
                      title="Select athlete"
                    >
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
                    </button>

                    <div className="ml-2 flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                        onClick={() => addFavorite(c)}
                        disabled={isFav(c.id)}
                        title={isFav(c.id) ? "Already in Favorites" : "Add to Favorites"}
                      >
                        {isFav(c.id) ? "Added" : "Add"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="col-span-1 row-span-1 rounded-lg border bg-card flex flex-col min-h-0">
          <div className="border-b p-3">
            <div className="text-sm font-medium">Athlete</div>
            <div className="text-xs text-muted-foreground">Selected athlete profile (informational).</div>
          </div>

          <div className="min-h-0 overflow-auto p-3">
            {!selected ? (
              <div className="text-sm text-muted-foreground">Select an athlete from Results or Favorites.</div>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="text-lg font-semibold">{selected.displayName}</div>
                  <div className="text-sm text-muted-foreground">
                    {selected.eventGroup ?? "—"} · {selected.gradYear ?? "—"}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {candidateCues(selected).map((cue) => (
                    <div key={cue.label} className="rounded-md border bg-muted/10 px-2 py-1">
                      <div className="text-[10px] text-muted-foreground">{cue.label}</div>
                      <div className="text-xs font-mono">{cue.value}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-md border bg-muted/10 p-3">
                  <div className="text-xs font-medium">Raw Metadata</div>
                  <pre className="mt-2 whitespace-pre-wrap break-words text-[11px] text-muted-foreground">
                    {JSON.stringify(selected.originMeta ?? {}, null, 2)}
                  </pre>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-60"
                    onClick={() => addFavorite(selected)}
                    disabled={isFav(selected.id)}
                    title={isFav(selected.id) ? "Already in Favorites" : "Add to Favorites"}
                  >
                    {isFav(selected.id) ? "Favorited" : "Add to Favorites"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
