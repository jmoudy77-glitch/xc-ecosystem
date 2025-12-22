// app/programs/[programId]/athletes/AthletesClient.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { CoachAthlete } from "@/lib/athletes";
import AthleteProfileShell from "./components/AthleteProfileShell";
import { GLASS_SCROLLBAR, WorkspacePanel } from "@/components/ui/SurfaceShell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  programId: string;
  initialAthletes: CoachAthlete[];
};

/**
 * Coach-facing Athletes client surface
 *
 * Responsibilities:
 * - Present a fast, filterable list of athletes
 * - Own selection state
 * - Act as the orchestration layer for profile slide-outs (added next)
 *
 * NOTE:
 * This component intentionally does NOT fetch data on its own.
 * All data contracts flow: DB → API → lib → page → here.
 */
export default function AthletesClient({
  programId,
  initialAthletes,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Rail filters (selectors; kept local and predictable)
  const [selectedProgramId, setSelectedProgramId] = useState(programId);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(() => {
    // Allow deep-linking via ?seasonId=...
    const fromUrl = searchParams?.get("seasonId");
    return fromUrl && fromUrl.trim().length ? fromUrl : "active";
  });

  const athletes = useMemo(() => initialAthletes, [initialAthletes]);

  function normalizeEventGroup(raw: string | null | undefined) {
    const v = (raw ?? "").trim();
    if (!v) return "Other";
    const upper = v.toUpperCase();

    const map: Record<string, string> = {
      DIST: "Distance",
      DISTANCE: "Distance",
      MID: "Mid-Distance",
      MIDDISTANCE: "Mid-Distance",
      "MID DISTANCE": "Mid-Distance",
      SPRINT: "Sprints",
      SPRINTS: "Sprints",
      HURDLE: "Hurdles",
      HURDLES: "Hurdles",
      JUMP: "Jumps",
      JUMPS: "Jumps",
      THROW: "Throws",
      THROWS: "Throws",
    };

    if (map[upper]) return map[upper];

    // Title-case fallback
    return v
      .toLowerCase()
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  // Derive selector options from current data (safe even if minimal)
  const programOptions = useMemo(
    () => [{ id: programId, label: "Current program" }],
    [programId],
  );

  const seasonOptions = useMemo(() => {
    // If we later add season context to CoachAthlete, extend this.
    // For now, keep selectors functional + predictable.
    return [
      { id: "active", label: "Active season" },
      { id: "all", label: "All seasons" },
    ];
  }, []);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();

    const base = athletes.filter((a) => {
      // Program filter: page is scoped to program, but keep selector semantics.
      // If future data includes program_id on each athlete row, this will still hold.
      const rowProgramId =
        (a as any).programId ??
        (a as any).program_id ??
        (a as any).programAthlete?.programId ??
        (a as any).program_athlete?.program_id ??
        programId;

      if (selectedProgramId && rowProgramId && rowProgramId !== selectedProgramId) {
        return false;
      }

      // Season filter: currently not represented on CoachAthlete; keep selector semantics.
      // If future data includes season/teamSeasonId, wire here.
      if (selectedSeasonId && selectedSeasonId !== "all") {
        const rowSeasonId =
          (a as any).seasonId ??
          (a as any).season_id ??
          (a as any).teamSeasonId ??
          (a as any).team_season_id ??
          null;

        // If we have season ids, enforce; otherwise keep predictable (do not hide data).
        if (rowSeasonId && rowSeasonId !== selectedSeasonId) return false;
      }

      return true;
    });

    const filtered = q
      ? base.filter((a) => {
          const name = `${a.athlete.firstName} ${a.athlete.lastName}`.toLowerCase();
          const eg = (a.athlete.eventGroup ?? "").toLowerCase();
          const gy = String(a.athlete.gradYear ?? "").toLowerCase();
          const hs = (a.athlete.hsSchoolName ?? "").toLowerCase();
          return (
            name.includes(q) ||
            eg.includes(q) ||
            gy.includes(q) ||
            hs.includes(q)
          );
        })
      : base;

    // Group by event group (stable + predictable)
    const map = new Map<string, CoachAthlete[]>();
    for (const a of filtered) {
      const key = normalizeEventGroup(a.athlete.eventGroup);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }

    // Sort groups alphabetically
    const groups = Array.from(map.entries()).sort(([a], [b]) =>
      a.localeCompare(b),
    );

    // Sort athletes within group alphabetically (Last, First)
    const sortedGroups = groups.map(([key, list]) => {
      const sorted = [...list].sort((x, y) => {
        const ln = x.athlete.lastName.localeCompare(y.athlete.lastName);
        if (ln !== 0) return ln;
        return x.athlete.firstName.localeCompare(y.athlete.firstName);
      });
      return { key, athletes: sorted };
    });

    return sortedGroups;
  }, [athletes, programId, query, selectedProgramId, selectedSeasonId]);

  const filteredAthleteIdsInOrder = useMemo(() => {
    const ids: string[] = [];
    for (const g of grouped) {
      for (const a of g.athletes) ids.push(a.athleteId);
    }
    return ids;
  }, [grouped]);

  const firstFilteredAthleteId = filteredAthleteIdsInOrder[0] ?? null;

  const selectedAthlete = useMemo(
    () =>
      selectedAthleteId
        ? athletes.find((a) => a.athleteId === selectedAthleteId) ?? null
        : null,
    [athletes, selectedAthleteId],
  );

  useEffect(() => {
    // On first load, select the first athlete in the currently filtered list.
    if (!selectedAthleteId) {
      if (firstFilteredAthleteId) setSelectedAthleteId(firstFilteredAthleteId);
      return;
    }

    // If the current selection is no longer visible under filters/search, fall back.
    if (selectedAthleteId && !filteredAthleteIdsInOrder.includes(selectedAthleteId)) {
      if (firstFilteredAthleteId) setSelectedAthleteId(firstFilteredAthleteId);
      else setSelectedAthleteId(null);
    }
  }, [firstFilteredAthleteId, filteredAthleteIdsInOrder, selectedAthleteId]);

  useEffect(() => {
    if (!selectedAthlete) return;
    const key = normalizeEventGroup(selectedAthlete.athlete.eventGroup);
    setOpenGroups((prev) => {
      if (prev[key] === true) return prev;
      return { ...prev, [key]: true };
    });
  }, [selectedAthlete]);

  return (
    <div
      className="rounded-xl flex w-full box-border min-h-0 overflow-hidden bg-surface/08 backdrop-blur-sm gap-6 md:max-h-[calc(100dvh-240px)]"
    >
      {/* No inner padding: page container controls horizontal gutters to match the program header */}
      {/* Athlete profile surface (center panel) */}
      <WorkspacePanel className="flex-1 min-w-0 max-h-full overflow-hidden rounded-2xl px-0 py-0">
        <div className="relative max-h-full overflow-hidden">
          {selectedAthlete ? (
            <AthleteProfileShell programId={programId} athlete={selectedAthlete} />
          ) : athletes.length > 0 ? (
            <div className="flex h-full items-center justify-center text-muted">
              Loading athlete…
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted">
              No athletes found
            </div>
          )}
        </div>
      </WorkspacePanel>

      {/* Athlete list (selection rail panel) */}
      <WorkspacePanel className="w-[360px] shrink-0 max-h-full overflow-hidden rounded-2xl px-0 py-0">
        <div className="flex max-h-full min-h-0 flex-col">
          {/* Top controls: search + program/season selector */}
          <div className="relative bg-black/25 backdrop-blur-md px-4 py-4 ring-1 ring-inset ring-white/8 shadow-sm shadow-black/30">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[radial-gradient(700px_120px_at_50%_0%,rgba(255,255,255,0.07),transparent_70%)]" />
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-foreground">Athletes</div>
              <div className="text-xs text-muted">{athletes.length}</div>
            </div>

            <div className="mt-2.5">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search athletes…"
                className="w-full rounded-lg bg-black/20 backdrop-blur-md px-3 py-2 text-sm text-foreground placeholder:text-muted ring-1 ring-white/8 shadow-sm shadow-black/30 hover:bg-black/25 transition-colors focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <div>
                <div className="text-[11px] text-muted mb-1">Program</div>
                <Select
                  value={selectedProgramId}
                  onValueChange={(next) => {
                    setSelectedProgramId(next);
                    const sp = new URLSearchParams(searchParams?.toString());
                    if (selectedSeasonId) sp.set("seasonId", selectedSeasonId);
                    router.replace(`?${sp.toString()}`);
                  }}
                >
                  <SelectTrigger className="w-full rounded-lg bg-black/20 backdrop-blur-md px-3 py-2 text-sm text-foreground ring-1 ring-white/8 shadow-sm shadow-black/30 hover:bg-black/25 transition-colors focus:outline-none focus:ring-2 focus:ring-brand/40">
                    <SelectValue placeholder="Current program" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl bg-black/70 backdrop-blur-md ring-1 ring-white/10 shadow-lg shadow-black/40">
                    {programOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="text-[11px] text-muted mb-1">Season</div>
                <Select
                  value={selectedSeasonId}
                  onValueChange={(next) => {
                    setSelectedSeasonId(next);
                    const sp = new URLSearchParams(searchParams?.toString());
                    if (next && next !== "active") sp.set("seasonId", next);
                    else sp.delete("seasonId");
                    router.replace(`?${sp.toString()}`);
                  }}
                >
                  <SelectTrigger className="w-full rounded-lg bg-black/20 backdrop-blur-md px-3 py-2 text-sm text-foreground ring-1 ring-white/8 shadow-sm shadow-black/30 hover:bg-black/25 transition-colors focus:outline-none focus:ring-2 focus:ring-brand/40">
                    <SelectValue placeholder="Active season" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl bg-black/70 backdrop-blur-md ring-1 ring-white/10 shadow-lg shadow-black/40">
                    {seasonOptions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Grouped list */}
          <div className="relative flex-1 min-h-0 overflow-hidden px-1 pr-2 py-1 flex flex-col max-h-full">
            <div className="pointer-events-none sticky top-0 z-10 h-4 bg-gradient-to-b from-surface/60 to-transparent" />
            <div
              className={[
                "flex-1 min-h-0 overflow-y-auto pr-1 pl-0.5 py-0.5 space-y-2 overscroll-contain",
                GLASS_SCROLLBAR,
              ].join(" ")}
            >
              {grouped.map((g) => {
                const isOpen = openGroups[g.key] ?? false;

                // Attention indicators are intentionally reserved (truth-first, no triage).
                // Wire these once factual attention flags are defined.
                const groupHasAttention = false;

                return (
                  <div
                    key={g.key}
                    className="relative mx-0.5 rounded-xl bg-surface/08 backdrop-blur-xl overflow-hidden ring-1 ring-inset ring-white/10 shadow-sm shadow-black/20"
                  >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-[radial-gradient(700px_120px_at_50%_0%,rgba(255,255,255,0.06),transparent_70%)]" />
                    <button
                      type="button"
                      onClick={() =>
                        setOpenGroups((prev) => ({
                          ...prev,
                          [g.key]: !(prev[g.key] ?? false),
                        }))
                      }
                      className="w-full text-left px-3 py-2.5 hover:bg-surface/15 transition-colors focus:outline-none focus:ring-2 focus:ring-brand/40"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-foreground">
                            {g.key}
                          </div>
                          {groupHasAttention ? (
                            <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[11px] text-warning">
                              !
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted">
                          <span>{g.athletes.length}</span>
                          <span
                            className={[
                              "inline-flex h-5 w-5 items-center justify-center rounded-md bg-surface/20 backdrop-blur-xl transition-transform",
                              isOpen ? "rotate-90" : "rotate-0",
                            ].join(" ")}
                            aria-hidden
                          >
                            <svg
                              viewBox="0 0 20 20"
                              className="h-3.5 w-3.5 text-muted"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M7.21 14.77a.75.75 0 0 1 .02-1.06L10.94 10 7.23 6.29a.75.75 0 1 1 1.06-1.06l4.24 4.24a.75.75 0 0 1 0 1.06l-4.24 4.24a.75.75 0 0 1-1.08 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </span>
                        </div>
                      </div>
                    </button>

                    {isOpen ? (
                      <div
                        className={[
                          "border-t border-white/10 max-h-[320px] overflow-y-auto overscroll-contain pr-0.5",
                          GLASS_SCROLLBAR,
                        ].join(" ")}
                      >
                        <ul>
                          {g.athletes.map((a) => {
                            const isActive = a.athleteId === selectedAthleteId;

                            // Reserve subtle per-athlete attention marker (thin amber indicator).
                            const hasAttention = false;

                            const initials = `${a.athlete.firstName?.[0] ?? ""}${a.athlete.lastName?.[0] ?? ""}`;
                            const secondary = [
                              normalizeEventGroup(a.athlete.eventGroup),
                              String(a.athlete.gradYear),
                            ].join(" · ");

                            return (
                              <li key={a.programAthleteId} className="border-b border-white/5 last:border-b-0">
                                <button
                                  type="button"
                                  onClick={() => setSelectedAthleteId(a.athleteId)}
                                  className={[
                                    "relative w-full text-left px-3 py-3 transition-colors",
                                    "focus:outline-none focus:ring-2 focus:ring-brand/40",
                                    isActive ? "bg-brand-soft" : "hover:bg-surface/10",
                                  ].join(" ")}
                                >
                                  {isActive ? (
                                    <div className="absolute left-0 top-0 h-full w-0.5 bg-brand/60" />
                                  ) : null}
                                  <div className="flex items-start gap-3">
                                    <div
                                      className={[
                                        "mt-0.5 h-9 w-9 shrink-0 rounded-full bg-surface/10 backdrop-blur-xl flex items-center justify-center text-xs font-semibold text-foreground ring-1 ring-white/10 shadow-sm shadow-black/20",
                                      ].join(" ")}
                                    >
                                      {initials}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="truncate text-sm font-medium text-foreground">
                                          {a.athlete.firstName} {a.athlete.lastName}
                                        </div>

                                        {a.athlete.isClaimed ? (
                                          <span className="shrink-0 rounded-full bg-success-soft/80 px-2 py-0.5 text-[11px] text-success">
                                            Claimed
                                          </span>
                                        ) : (
                                          <span className="shrink-0 rounded-full bg-surface/10 backdrop-blur-xl px-2 py-0.5 text-[11px] text-muted ring-1 ring-white/10 shadow-sm shadow-black/20">
                                            Unclaimed
                                          </span>
                                        )}
                                      </div>

                                      <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                                        <span className="truncate">{secondary}</span>
                                      </div>
                                    </div>

                                    {/* Subtle attention marker slot (no noise) */}
                                    <div className="w-2 shrink-0">
                                      {hasAttention ? (
                                        <div className="mt-1 h-6 w-1 rounded-full bg-warning" />
                                      ) : null}
                                    </div>
                                  </div>
                                </button>

                                {/* Thin attention accent on the left edge (reserved) */}
                                {hasAttention ? (
                                  <div className="h-px bg-warning/20" />
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {grouped.length === 0 ? (
                <div className="px-2 py-6 text-center text-sm text-muted">
                  No athletes found.
                </div>
              ) : null}
            </div>
            <div className="pointer-events-none sticky bottom-0 z-10 h-6 bg-gradient-to-t from-surface/60 to-transparent" />
          </div>
        </div>
      </WorkspacePanel>
    </div>
  );
}