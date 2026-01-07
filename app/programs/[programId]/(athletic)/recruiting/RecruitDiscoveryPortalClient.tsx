// app/programs/[programId]/(athletic)/recruiting/RecruitDiscoveryPortalClient.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AthleteProfileClient from "@/app/athletes/[athleteId]/AthleteProfileClient";
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

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function buildAthleteProfileInput(c: Candidate) {
  const m = (c?.originMeta ?? {}) as any;

  const schoolName =
    (typeof m?.school === "string" && m.school.trim()) ||
    (typeof m?.hs_school_name === "string" && m.hs_school_name.trim()) ||
    (typeof m?.hs_name === "string" && m.hs_name.trim()) ||
    null;

  const city =
    (typeof m?.city === "string" && m.city.trim()) ||
    (typeof m?.hs_city === "string" && m.hs_city.trim()) ||
    null;

  const state =
    (typeof m?.state === "string" && m.state.trim()) ||
    (typeof m?.hs_state === "string" && m.hs_state.trim()) ||
    (typeof m?.home_state === "string" && m.home_state.trim()) ||
    null;

  const schoolLocation = city && state ? `${city}, ${state}` : city ? city : state ? state : null;

  const avatarUrl =
    (typeof (c as any)?.avatarUrl === "string" && (c as any).avatarUrl.trim()) ||
    (typeof m?.avatarUrl === "string" && m.avatarUrl.trim()) ||
    (typeof m?.avatar_url === "string" && m.avatar_url.trim()) ||
    null;

  const gender = (typeof m?.gender === "string" && m.gender.trim()) || null;

  return {
    athlete: {
      id: c.id,
      fullName: c.displayName,
      gradYear: typeof c.gradYear === "number" ? c.gradYear : null,
      schoolName,
      schoolLocation,
      eventGroup: c.eventGroup ?? null,
      avatarUrl,
      gender,
    },
    roleContext: {
      // Discovery athlete panel must remain non-contextual / non-coach-tooling.
      isCoachView: false,
      isAthleteSelf: false,
    },
  };
}

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
    raw?.originMeta && typeof raw.originMeta === "object"
      ? (raw.originMeta as Record<string, unknown>)
      : {};

  return {
    id,
    displayName,
    eventGroup,
    gradYear,
    originKey,
    originMeta,
  };
}

function candidateFitScore(c: Candidate): number {
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

function scoreForMeta(m: Record<string, unknown> | null | undefined): number | null {
  if (!m || typeof m !== "object") return null;
  const v =
    (typeof (m as any).score === "number" && (m as any).score) ||
    (typeof (m as any).fit_score === "number" && (m as any).fit_score) ||
    (typeof (m as any).recruiting_score === "number" && (m as any).recruiting_score) ||
    null;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function candidateCues(c: Candidate): { label: string; value: string }[] {
  const cues: { label: string; value: string }[] = [];
  const m = c.originMeta ?? {};

  const fit = candidateFitScore(c);
  if (fit > 0) cues.push({ label: "Fit", value: String(Math.round(fit)) });

  const score = scoreForMeta(m);
  cues.push({ label: "Scout", value: score === null ? "—" : String(Math.round(score)) });

  const state =
    (typeof (m as any).state === "string" && (m as any).state.trim()) ||
    (typeof (m as any).home_state === "string" && (m as any).home_state.trim()) ||
    null;
  if (state) cues.push({ label: "State", value: state });

  return cues;
}

function loadFavorites(programId: string): Candidate[] {
  if (typeof window === "undefined") return [];
  const parsed = safeJsonParse<any[]>(window.localStorage.getItem(favoritesStorageKey(programId)));
  if (!Array.isArray(parsed)) return [];
  return parsed.map((row) => normalizeCandidate(row, "favorites")).filter(Boolean) as Candidate[];
}

function saveFavorites(programId: string, favorites: Candidate[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(favoritesStorageKey(programId), JSON.stringify(favorites));
}

function Badge({
  label,
  value,
  tone = "muted",
  mono = false,
  title,
  ariaLabel,
}: {
  label?: string;
  value?: string;
  tone?: "muted" | "danger";
  mono?: boolean;
  title?: string;
  ariaLabel?: string;
}) {
  const toneClass =
    tone === "danger"
      ? "text-rose-200"
      : "text-[var(--muted-foreground)]";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full ring-1 ring-panel bg-panel-muted px-2 py-0.5 text-[10px]",
        toneClass
      )}
      title={title}
      aria-label={ariaLabel}
    >
      {label ? <span className="text-subtle">{label}</span> : null}
      {value ? <span className={cn(mono && "font-mono")}>{value}</span> : null}
    </span>
  );
}

export default function RecruitDiscoveryPortalClient({ programId, sport }: Props) {
  const [surfaced, setSurfaced] = useState<Candidate[]>([]);
  const [favorites, setFavorites] = useState<Candidate[]>([]);
  const [stabilizationFavIds, setStabilizationFavIds] = useState<Set<string>>(new Set());
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

  // Load stabilization favorites once (read-only indicator).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/recruiting/favorites/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ programId, sport }),
        });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;

        const ids = new Set<string>(
          Array.isArray(json?.data)
            ? json.data
                .map((r: any) => (typeof r?.athlete_id === "string" ? r.athlete_id : null))
                .filter(Boolean)
            : []
        );
        setStabilizationFavIds(ids);
      } catch {
        // best-effort
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [programId, sport]);

  // Load filter options on open (client-only).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/recruiting/discovery/filters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ programId, sport }),
        });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;

        const ev = Array.isArray(json?.eventGroups) ? json.eventGroups.filter((x: any) => typeof x === "string") : [];
        const gy = Array.isArray(json?.gradYears) ? json.gradYears.filter((x: any) => typeof x === "number") : [];
        setFilterEventGroups(ev);
        setFilterGradYears(gy);
      } catch {
        // best-effort
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [programId, sport]);

  // Focus search input on mount.
  useEffect(() => {
    const t = window.setTimeout(() => searchInputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, []);

  const allEventGroups = useMemo(() => {
    const base = filterEventGroups.slice();
    base.sort((a, b) => a.localeCompare(b));
    return base;
  }, [filterEventGroups]);

  const allGradYears = useMemo(() => {
    const base = filterGradYears.slice();
    base.sort((a, b) => a - b);
    return base;
  }, [filterGradYears]);

  const isFav = (id: string) => favorites.some((f) => f.id === id);

  const applyFavoritesOrder = (rows: Candidate[], order: string[]) => {
    if (!order || order.length === 0) return rows;
    const byId = new Map(rows.map((r) => [r.id, r] as const));
    const ordered: Candidate[] = [];
    for (const id of order) {
      const row = byId.get(id);
      if (row) ordered.push(row);
    }
    const remaining = rows.filter((r) => !order.includes(r.id));
    return [...ordered, ...remaining];
  };

  const filteredFavorites = useMemo(() => {
    const ordered = applyFavoritesOrder(favorites, favoritesOrder);
    return ordered;
  }, [favorites, favoritesOrder]);

  const surfacedHeader = useMemo(() => {
    const n = surfaced.length;
    if (n === 0) return "No results.";
    if (n === 1) return "1 result.";
    return `${n} results.`;
  }, [surfaced.length]);

  const filteredSurfaced = useMemo(() => {
    const base = surfaced.slice();

    if (eventGroupFilter !== "all") {
      const eg = eventGroupFilter.toLowerCase();
      for (let i = base.length - 1; i >= 0; i--) {
        const v = String(base[i]?.eventGroup ?? "").toLowerCase();
        if (v !== eg) base.splice(i, 1);
      }
    }

    if (gradYearFilter !== "all") {
      const gy = Number(gradYearFilter);
      for (let i = base.length - 1; i >= 0; i--) {
        if (base[i]?.gradYear !== gy) base.splice(i, 1);
      }
    }

    base.sort((a, b) => {
      if (sortKey === "name") return a.displayName.localeCompare(b.displayName);
      if (sortKey === "gradYear") return (a.gradYear ?? 0) - (b.gradYear ?? 0);
      // default: fit desc
      return candidateFitScore(b) - candidateFitScore(a);
    });

    return base;
  }, [eventGroupFilter, gradYearFilter, sortKey, surfaced]);

  const runSearch = async () => {
    const query = q.trim();
    const filtersApplied = eventGroupFilter !== "all" || gradYearFilter !== "all";

    if (!query && !filtersApplied) {
      setHasSearched(true);
      setSurfaced([]);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsSearching(true);
    setHasSearched(true);

    try {
      const res = await fetch("/api/recruiting/discovery/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          programId,
          sport,
          q: query,
          eventGroup: eventGroupFilter === "all" ? null : eventGroupFilter,
          gradYear: gradYearFilter === "all" ? null : Number(gradYearFilter),
          limit: 50,
          offset: 0,
        }),
      });

      if (!res.ok) {
        setSurfaced([]);
        return;
      }

      const json = await res.json();
      const rows = Array.isArray(json?.data) ? (json.data as RecruitDiscoveryCandidate[]) : [];

      const normalized = rows
        .map((r: any) => ({
          id: r.id,
          displayName: r.full_name ?? r.fullName ?? r.name ?? "Unknown",
          eventGroup: r.event_group ?? r.eventGroup ?? null,
          gradYear: r.grad_year ?? r.gradYear ?? null,
          originKey: "surfaced" as const,
          originMeta: (r.originMeta && typeof r.originMeta === "object" ? r.originMeta : {}) as Record<string, unknown>,
        }))
        .map((r) => normalizeCandidate(r, "surfaced"))
        .filter(Boolean) as Candidate[];

      setSurfaced(normalized);

      // keep selection stable when possible
      if (selectedId) {
        const stillExists = normalized.some((c) => c.id === selectedId) || favorites.some((c) => c.id === selectedId);
        if (!stillExists) setSelectedId(null);
      }
    } catch (e: any) {
      if (String(e?.name) === "AbortError") return;
      setSurfaced([]);
    } finally {
      setIsSearching(false);
    }
  };

  const scheduleAutoSearch = () => {
    if (!hasSearched) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void runSearch();
    }, 300) as any;
  };

  // After first explicit search, filter changes auto-refresh results.
  useEffect(() => {
    scheduleAutoSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventGroupFilter, gradYearFilter, sortKey]);

  const clearSearch = () => {
    if (abortRef.current) abortRef.current.abort();
    setQ("");
    setEventGroupFilter("all");
    setGradYearFilter("all");
    setSortKey("fit");
    setHasSearched(false);
    setSurfaced([]);
  };

  const addFavorite = (c: Candidate) => {
    setFavorites((prev) => {
      if (prev.some((x) => x.id === c.id)) return prev;
      const next = [...prev, { ...c, originKey: "favorites" }];
      saveFavorites(programId, next);
      return next;
    });
  };

  const removeFavorite = (candidateId: string) => {
    setFavorites((prev) => {
      const next = prev.filter((x) => x.id !== candidateId);
      saveFavorites(programId, next);
      return next;
    });
    setFavoritesOrder((prev) => {
      const next = prev.filter((id) => id !== candidateId);
      writeFavoritesOrder(programId, next);
      return next;
    });
  };

  const pinFavoriteToTop = (candidateId: string) => {
    setFavoritesOrder((prev) => {
      const ids = prev.filter((id) => id !== candidateId);
      const next = [candidateId, ...ids];
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

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = (target?.tagName ?? "").toLowerCase();
      const isTyping =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        (target?.getAttribute("contenteditable") === "true");

      if (isTyping) return;

      const list = activeList === "results" ? filteredSurfaced : filteredFavorites;
      if (list.length === 0) return;

      const idx = selectedId ? list.findIndex((x) => x.id === selectedId) : -1;

      if (e.key === "ArrowDown") {
        const next = list[Math.min(list.length - 1, Math.max(0, idx + 1))];
        if (next) setSelectedId(next.id);
        e.preventDefault();
      } else if (e.key === "ArrowUp") {
        const next = list[Math.max(0, idx <= 0 ? 0 : idx - 1)];
        if (next) setSelectedId(next.id);
        e.preventDefault();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        setActiveList((prev) => (prev === "results" ? "favorites" : "results"));
        e.preventDefault();
      } else if (e.key === "Escape") {
        setSelectedId(null);
        e.preventDefault();
      } else if (e.key.toLowerCase() === "a") {
        if (!selectedId) return;
        const inFav = isFav(selectedId);
        const row = favorites.find((x) => x.id === selectedId) ?? surfaced.find((x) => x.id === selectedId);
        if (!row) return;
        if (inFav) removeFavorite(selectedId);
        else addFavorite(row);
        e.preventDefault();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeList, favorites, filteredFavorites, filteredSurfaced, selectedId, surfaced]);

  // Scroll selected row into view.
  useEffect(() => {
    if (!selectedId) return;
    const el = rowRefs.current[selectedId];
    if (!el) return;
    el.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onClear: () => void }> = [];

    if (q.trim()) chips.push({ key: "q", label: `Search: ${q.trim()}`, onClear: () => setQ("") });
    if (eventGroupFilter !== "all")
      chips.push({ key: "eg", label: `Event: ${eventGroupFilter}`, onClear: () => setEventGroupFilter("all") });
    if (gradYearFilter !== "all")
      chips.push({ key: "gy", label: `Grad: ${gradYearFilter}`, onClear: () => setGradYearFilter("all") });

    return chips;
  }, [eventGroupFilter, gradYearFilter, q]);

  const listboxIdResults = "recruit-discovery-results";
  const listboxIdFavorites = "recruit-discovery-favorites";

  return (
    <div className="h-full w-full p-4 min-h-0">
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
        {/* Filter/Search panel */}
        <section className="col-span-2 row-span-1 rounded-2xl ring-1 ring-panel panel min-h-0 overflow-hidden">
          <div className="flex h-full flex-col gap-3 px-4 py-3">
            {/* Controls row */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Left: dominant search */}
              <div className="flex min-w-[280px] flex-1 items-center gap-2 rounded-xl ring-1 ring-panel panel-muted px-3 py-2">
                <div className="text-[11px] text-muted shrink-0">Search</div>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") runSearch();
                  }}
                  placeholder="Name, school, state, event group…"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-subtle)]/70"
                  ref={searchInputRef}
                  aria-label="Search recruits"
                />
              </div>

              {/* Middle: compact selects */}
              <div className="flex items-center gap-2">
                <div className="text-[11px] text-muted">Event</div>
                <select
                  value={eventGroupFilter}
                  onChange={(e) => setEventGroupFilter(e.target.value)}
                  className="h-9 rounded-xl ring-1 ring-panel panel-muted px-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                  aria-label="Filter by event group"
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
                <div className="text-[11px] text-muted">Grad</div>
                <select
                  value={gradYearFilter}
                  onChange={(e) => setGradYearFilter(e.target.value)}
                  className="h-9 rounded-xl ring-1 ring-panel panel-muted px-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                  aria-label="Filter by graduation year"
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
                <div className="text-[11px] text-muted">Sort</div>
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className="h-9 rounded-xl ring-1 ring-panel panel-muted px-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                  aria-label="Sort results"
                >
                  <option value="fit">Fit</option>
                  <option value="name">Name</option>
                  <option value="gradYear">Grad Year</option>
                </select>
              </div>

              {/* Right: actions */}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  className="glass-pill glass-pill--brand-soft rounded-full px-3 py-2 text-sm ring-1 ring-panel hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] disabled:opacity-60"
                  onClick={runSearch}
                  disabled={isSearching}
                  aria-disabled={isSearching}
                  title="Search"
                >
                  {isSearching ? "Searching…" : "Search"}
                </button>
                <button
                  type="button"
                  className="glass-pill rounded-full px-3 py-2 text-sm ring-1 ring-panel hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                  onClick={clearSearch}
                  title="Clear search and filters"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Training-style subtext */}
            <div className="text-[11px] text-muted">{activeFilterSummary}</div>

            {activeChips.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {activeChips.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    className="glass-pill rounded-full px-2.5 py-1 text-[11px] ring-1 ring-panel hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                    onClick={c.onClear}
                    aria-label={`Clear ${c.label}`}
                  >
                    {c.label} <span className="ml-1 text-subtle">×</span>
                  </button>
                ))}
                <button
                  type="button"
                  className="glass-pill rounded-full px-2.5 py-1 text-[11px] ring-1 ring-panel hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                  onClick={clearSearch}
                >
                  Reset all
                </button>
              </div>
            ) : null}
          </div>
        </section>

        {/* Favorites panel (right, 30%, 100% height) */}
        <section className="col-span-1 row-span-2 rounded-2xl ring-1 ring-panel panel flex flex-col min-h-0 overflow-hidden">
          <div className="border-b border-subtle px-3 py-3">
            <div className="text-sm font-semibold">Favorites</div>
            <div className="text-[11px] text-muted">Discovery-local shortlist. Exports on close.</div>
          </div>

          <div className="min-h-0 overflow-auto p-3 glass-scrollbar">
            {favorites.length === 0 ? (
              <div className="rounded-xl ring-1 ring-panel panel-muted px-3 py-3">
                <div className="text-sm font-medium">No favorites yet</div>
                <div className="mt-1 text-[11px] text-muted">
                  Add recruits from Results. This list is local to this device until you close the portal.
                </div>
              </div>
            ) : (
              <>
                {filteredFavorites.length === 0 ? (
                  <div className="rounded-xl ring-1 ring-panel panel-muted px-3 py-3">
                    <div className="text-sm font-medium">No matches</div>
                    <div className="mt-1 text-[11px] text-muted">
                      Filters removed all favorites. Reset filters to widen results.
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        className="glass-pill rounded-full px-3 py-1.5 text-[11px] ring-1 ring-panel hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                        onClick={resetFilters}
                      >
                        Reset filters
                      </button>
                      <div className="text-[11px] text-muted">{activeFilterSummary}</div>
                    </div>
                  </div>
                ) : (
                  <ul
                    id={listboxIdFavorites}
                    role="listbox"
                    aria-label="Favorites list"
                    aria-activedescendant={selectedId ? `fav-${selectedId}` : undefined}
                    className="space-y-2"
                  >
                    {filteredFavorites.map((c) => {
                      const isSelected = selectedId === c.id;
                      return (
                        <li
                          key={c.id}
                          id={`fav-${c.id}`}
                          role="option"
                          aria-selected={isSelected}
                          ref={(el) => {
                            rowRefs.current[c.id] = el;
                          }}
                          className={cn(
                            "flex items-start justify-between rounded-xl ring-1 ring-panel panel-muted px-3 py-2",
                            isSelected && "ring-2 ring-[var(--brand)]"
                          )}
                        >
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left focus:outline-none"
                            onClick={() => {
                              setSelectedId(c.id);
                              setActiveList("favorites");
                            }}
                            title="Select athlete"
                          >
                            <div className="truncate text-sm font-semibold">{c.displayName}</div>
                            <div className="text-[11px] text-muted">
                              {c.eventGroup ?? "—"} · {c.gradYear ?? "—"}
                            </div>
                          </button>

                          <div className="ml-2 flex items-center gap-1">
                            <button
                              type="button"
                              className="glass-pill rounded-full px-2 py-1 text-[11px] ring-1 ring-panel hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                              onClick={() => pinFavoriteToTop(c.id)}
                              title="Pin to top"
                              aria-label="Pin to top"
                            >
                              Pin
                            </button>
                            <button
                              type="button"
                              className="glass-pill rounded-full px-2 py-1 text-[11px] ring-1 ring-panel hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                              onClick={() => moveFavorite(c.id, "up")}
                              title="Move up"
                              aria-label="Move up"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className="glass-pill rounded-full px-2 py-1 text-[11px] ring-1 ring-panel hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                              onClick={() => moveFavorite(c.id, "down")}
                              title="Move down"
                              aria-label="Move down"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              className="glass-pill rounded-full px-2 py-1 text-[11px] ring-1 ring-panel hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                              onClick={() => removeFavorite(c.id)}
                              title="Remove from Favorites"
                              aria-label="Remove from Favorites"
                            >
                              Remove
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}

            {favorites.length > 0 ? (
              <div className="mt-3 flex items-center justify-between rounded-xl ring-1 ring-panel panel-muted px-3 py-2">
                <div className="text-[11px] text-muted">Order is local to this device.</div>
                <button
                  type="button"
                  className="glass-pill rounded-full px-2.5 py-1 text-[11px] ring-1 ring-panel hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                  onClick={() => {
                    clearFavoritesOrder(programId);
                    setFavoritesOrder([]);
                  }}
                  title="Reset favorite ordering"
                >
                  Reset order
                </button>
              </div>
            ) : null}
          </div>
        </section>

        {/* Results panel (left, 30%, 80% height) */}
        <section className="col-span-1 row-span-1 rounded-2xl ring-1 ring-panel panel flex flex-col min-h-0 overflow-hidden">
          <div className="border-b border-subtle px-3 py-3">
            <div className="text-sm font-semibold">Results</div>
            <div className="text-[11px] text-muted">
              {!hasSearched
                ? "Empty until Search is run."
                : filteredSurfaced.length === surfaced.length
                  ? surfacedHeader
                  : `${filteredSurfaced.length} of ${surfaced.length} results (filtered).`}
            </div>
          </div>

          <div className="min-h-0 overflow-auto p-3 glass-scrollbar">
            {!hasSearched ? (
              <div className="text-sm text-muted">Run a search to populate results.</div>
            ) : isSearching ? (
              <div className="text-sm text-muted">Searching…</div>
            ) : surfaced.length === 0 ? (
              <div className="text-sm text-muted">No matches for the current query or filters.</div>
            ) : filteredSurfaced.length === 0 ? (
              <div className="rounded-xl ring-1 ring-panel panel-muted px-3 py-3">
                <div className="text-sm font-medium">No matches</div>
                <div className="mt-1 text-[11px] text-muted">
                  Filters removed all results. Reset filters to widen results.
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    className="glass-pill rounded-full px-3 py-1.5 text-[11px] ring-1 ring-panel hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                    onClick={resetFilters}
                  >
                    Reset filters
                  </button>
                  <div className="text-[11px] text-muted">{activeFilterSummary}</div>
                </div>
              </div>
            ) : (
              <ul
                id={listboxIdResults}
                role="listbox"
                aria-label="Search results"
                aria-activedescendant={selectedId ? `res-${selectedId}` : undefined}
                className="space-y-2"
              >
                {filteredSurfaced.map((c) => {
                  const isSelected = selectedId === c.id;
                  const alreadyFav = isFav(c.id);
                  return (
                    <li
                      key={c.id}
                      id={`res-${c.id}`}
                      role="option"
                      aria-selected={isSelected}
                      ref={(el) => {
                        rowRefs.current[c.id] = el;
                      }}
                      className={cn(
                        "flex items-start justify-between rounded-xl ring-1 ring-panel panel-muted px-3 py-2",
                        isSelected && "ring-2 ring-[var(--brand)]"
                      )}
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left focus:outline-none"
                        onClick={() => {
                          setSelectedId(c.id);
                          setActiveList("results");
                        }}
                        title="Select athlete"
                      >
                        <div className="truncate text-sm font-semibold">{c.displayName}</div>
                        <div className="text-[11px] text-muted">
                          {c.eventGroup ?? "—"} · {c.gradYear ?? "—"}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {stabilizationFavIds.has(c.id) ? (
                            <Badge
                              tone="danger"
                              value="♥"
                              title="Already in Stabilization favorites"
                              ariaLabel="Already in Stabilization favorites"
                            />
                          ) : null}

                          {candidateCues(c)
                            .slice(0, 3)
                            .map((cue) => (
                              <Badge
                                key={cue.label}
                                label={cue.label}
                                value={cue.value}
                                mono
                                title={`${cue.label}: ${cue.value}`}
                              />
                            ))}
                        </div>
                      </button>

                      <div className="ml-2 flex items-center gap-2">
                        <button
                          type="button"
                          className={cn(
                            "glass-pill rounded-full px-3 py-1.5 text-[11px] ring-1 ring-panel focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]",
                            alreadyFav ? "opacity-60 cursor-not-allowed" : "hover:opacity-95"
                          )}
                          onClick={() => addFavorite(c)}
                          disabled={alreadyFav}
                          aria-disabled={alreadyFav}
                          title={alreadyFav ? "Already in Favorites" : "Add to Favorites"}
                        >
                          {alreadyFav ? "Added" : "Add"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Athlete profile panel (middle, 40%, 80% height) */}
        <section className="col-span-1 row-span-1 rounded-2xl ring-1 ring-panel panel min-h-0 overflow-hidden">
          <div className="relative h-full min-h-0">
            <div className="absolute right-3 top-3 z-10">
              <button
                type="button"
                className="glass-pill glass-pill--brand-soft inline-flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-panel hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] disabled:opacity-60"
                disabled={!selected}
                onClick={() => {
                  if (!selected) return;
                  if (isFav(selected.id)) removeFavorite(selected.id);
                  else addFavorite(selected);
                }}
                aria-label={selected && isFav(selected.id) ? "Remove from favorites" : "Add to favorites"}
                title={selected && isFav(selected.id) ? "Remove from favorites" : "Add to favorites"}
              >
                {selected && isFav(selected.id) ? "♥" : "♡"}
              </button>
            </div>

            <div className="h-full min-h-0 overflow-auto p-3 glass-scrollbar">
              {selected ? (
                <AthleteProfileClient {...buildAthleteProfileInput(selected)} />
              ) : (
                <div className="rounded-xl ring-1 ring-panel panel-muted px-3 py-3">
                  <div className="text-sm font-medium">No athlete selected</div>
                  <div className="mt-1 text-[11px] text-muted">
                    Select an athlete from Results or Favorites to view their profile.
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
