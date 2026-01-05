// app/programs/[programId]/programNav.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { ProgramHealthA2OverlayToggle } from "@/app/app/programs/[programId]/(athletic)/program-health/ProgramHealthA2OverlayToggle";

type ProgramNavModeId =
  | "analyze"
  | "plan"
  | "manage"
  | "compete"
  | "administrate";

type ProgramNavItemId =
  | "dashboard"
  | "athletes"
  | "training"
  | "recruiting"
  | "roster_planning"
  | "performance"
  | "program_health"
  | "resources"
  | "knowledge"
  | "files"
  | "media"
  | "gear"
  | "meets"
  | "teams"
  | "facilities"
  | "staff"
  | "branding"
  | "billing"
  | "account";

type ProgramNavContext = {
  programId: string;
  teamId?: string | null;
};

type ProgramNavHref = string | ((ctx: ProgramNavContext) => string);

type ProgramNavItem = {
  id: ProgramNavItemId;
  label: string;
  href: ProgramNavHref;
  disabled?: boolean;
  badge?: string;
  isActive?: (pathname: string, ctx: ProgramNavContext) => boolean;
  order?: number;
  children?: ProgramNavItem[];
};

type ProgramNavGroup = {
  id: ProgramNavModeId;
  label: string;
  description?: string;
  items: ProgramNavItem[];
  collapsible?: boolean;
  order?: number;
};

type PersistedContext = {
  teamId?: string | null;
  teamName?: string | null;
  seasonId?: string | null;
  seasonName?: string | null;
  seasonStatus?: string | null;
};

const ctxStorageKey = (programId: string) => `xc_ctx_${programId}`;

function readCtx(programId: string): PersistedContext {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(ctxStorageKey(programId));
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeCtx(programId: string, ctx: PersistedContext) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ctxStorageKey(programId), JSON.stringify(ctx));
  } catch {
    // ignore
  }

  // Cookie mirror (future SSR use)
  try {
    const v = encodeURIComponent(JSON.stringify(ctx));
    document.cookie = `xc_ctx_${programId}=${v}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`;
  } catch {
    // ignore
  }
}

type TeamOption = { id: string; name: string | null };
type SeasonOption = { id: string; name: string | null; status?: string | null };

function pickFirstString(v: any): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

function normalizeSeasonLabel(label: string): string {
  // Remove a leading "Season" prefix that may have been baked into saved names.
  // Examples: "Season 2025" -> "2025", "season: Indoor" -> "Indoor"
  const cleaned = label.replace(/^\s*season\s*[:\-]?\s*/i, "").trim();
  return cleaned || label.trim();
}

function labelForSeason(raw: any): string {
  if (!raw || typeof raw !== "object") return "Season";

  // Common name-ish fields
  const direct =
    pickFirstString(raw.name) ||
    pickFirstString(raw.season_name) ||
    pickFirstString(raw.label) ||
    pickFirstString(raw.title) ||
    pickFirstString(raw.display_name) ||
    pickFirstString(raw.short_name);
  if (direct) return normalizeSeasonLabel(direct);

  // Year-style fields
  const year =
    pickFirstString(raw.year) ||
    pickFirstString(raw.season_year) ||
    pickFirstString(raw.start_year);
  const endYear = pickFirstString(raw.end_year);
  if (year && endYear && year !== endYear) return normalizeSeasonLabel(`${year}–${endYear}`);
  if (year) return normalizeSeasonLabel(`${year}`);

  // Date-style fields (best-effort)
  const start = pickFirstString(raw.start_date) || pickFirstString(raw.starts_at);
  const end = pickFirstString(raw.end_date) || pickFirstString(raw.ends_at);
  if (start && end) return normalizeSeasonLabel(`${start} → ${end}`);
  if (start) return normalizeSeasonLabel(`${start}`);

  // Final fallback: derive something stable and non-generic.
  // Prefer created_at year, else short id.
  try {
    const created = pickFirstString((raw as any).created_at) || pickFirstString((raw as any).createdAt);
    if (created) {
      const d = new Date(created);
      if (!Number.isNaN(d.getTime())) {
        return normalizeSeasonLabel(`${d.getUTCFullYear()}`);
      }
    }
  } catch {
    // ignore
  }

  const id = pickFirstString((raw as any).id);
  if (id) return normalizeSeasonLabel(id.slice(0, 6));

  return "Season";
}

function statusForSeason(raw: any): string | null {
  if (!raw || typeof raw !== "object") return null;
  return pickFirstString(raw.status) || pickFirstString(raw.state) || null;
}

export function ProgramContextBar({
  programId,
  programName,
}: {
  programId: string;
  programName: string;
}) {
  const [ctx, setCtx] = useState<PersistedContext>({});
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);

  const router = useRouter();

  const programRef = useRef<HTMLDetailsElement | null>(null);
  const teamRef = useRef<HTMLDetailsElement | null>(null);
  const seasonRef = useRef<HTMLDetailsElement | null>(null);

  const closeAll = () => {
    programRef.current?.removeAttribute("open");
    teamRef.current?.removeAttribute("open");
    seasonRef.current?.removeAttribute("open");
  };

  const closeOthers = (keep: "program" | "team" | "season") => {
    if (keep !== "program") programRef.current?.removeAttribute("open");
    if (keep !== "team") teamRef.current?.removeAttribute("open");
    if (keep !== "season") seasonRef.current?.removeAttribute("open");
  };

  useEffect(() => {
    setCtx(readCtx(programId));
  }, [programId]);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node | null;
      if (!t) return;
      const inProgram = programRef.current?.contains(t);
      const inTeam = teamRef.current?.contains(t);
      const inSeason = seasonRef.current?.contains(t);
      if (inProgram || inTeam || inSeason) return;
      closeAll();
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadTeams() {
      try {
        const res = await fetch(`/api/programs/${programId}/teams`, { cache: "no-store" });
        const json = await res.json().catch(() => null);
        const list: TeamOption[] = Array.isArray(json)
          ? json
          : Array.isArray((json as any)?.data)
          ? (json as any).data
          : Array.isArray((json as any)?.teams)
          ? (json as any).teams
          : [];
        if (!cancelled) setTeams(list);
      } catch {
        if (!cancelled) setTeams([]);
      }
    }
    loadTeams();
    return () => {
      cancelled = true;
    };
  }, [programId]);

  useEffect(() => {
    if (!ctx.teamId) {
      setSeasons([]);
      return;
    }
    let cancelled = false;
    async function loadSeasons() {
      try {
        const res = await fetch(`/api/programs/${programId}/teams/${ctx.teamId}/seasons`, { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setSeasons([]);
          return;
        }
        const json = await res.json().catch(() => null);
        const rawList: any[] = Array.isArray(json)
          ? json
          : Array.isArray((json as any)?.data)
          ? (json as any).data
          : Array.isArray((json as any)?.seasons)
          ? (json as any).seasons
          : [];

        const list: SeasonOption[] = rawList
          .map((s) => {
            const id = (s as any)?.id as string | undefined;
            if (!id) return null;
            return {
              id,
              name: labelForSeason(s),
              status: statusForSeason(s),
            } as SeasonOption;
          })
          .filter(Boolean) as SeasonOption[];

        if (!cancelled) setSeasons(list);
      } catch {
        if (!cancelled) setSeasons([]);
      }
    }
    loadSeasons();
    return () => {
      cancelled = true;
    };
  }, [programId, ctx.teamId]);

  const teamLabel = useMemo(() => ctx.teamName || "Not selected", [ctx.teamName]);
  const seasonLabel = useMemo(() => ctx.seasonName || "Not selected", [ctx.seasonName]);
  const seasonMicro = useMemo(() => {
    const s = ctx.seasonStatus?.toLowerCase?.();
    if (!s) return null;
    if (s.includes("draft")) return "Draft";
    if (s.includes("lock")) return "Locked";
    return null;
  }, [ctx.seasonStatus]);

  function apply(next: PersistedContext) {
    setCtx(next);
    writeCtx(programId, next);
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 text-[11px] text-muted">
      <details
        ref={programRef}
        className="group relative"
        onToggle={(e) => {
          const el = e.currentTarget;
          if (el.open) closeOthers("program");
        }}
      >
        <summary className="list-none cursor-pointer select-none rounded-full ring-1 ring-panel bg-panel-muted px-2 py-0.5 hover:bg-panel focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]">
          <span className="text-subtle">Program:</span>{" "}
          <span className="text-[var(--text)]">{programName}</span>{" "}
          <span className="text-subtle">▾</span>
        </summary>
        <div className="absolute right-0 z-[10000] mt-2 w-64 rounded-xl border border-subtle bg-panel p-2 shadow-lg">
          <p className="px-2 pb-1 text-[10px] uppercase tracking-wide text-subtle">Program</p>
          <a
            href={`/dashboard/programs/${programId}`}
            className="block rounded-lg px-2 py-2 text-sm text-[var(--text)] hover:bg-panel-muted"
          >
            Open Program Overview
          </a>
          <a
            href="/dashboard"
            className="block rounded-lg px-2 py-2 text-sm text-[var(--text)] hover:bg-panel-muted"
          >
            Switch Program
          </a>
        </div>
      </details>

      <span className="text-subtle">·</span>

      <details
        ref={teamRef}
        className="group relative"
        onToggle={(e) => {
          const el = e.currentTarget;
          if (el.open) closeOthers("team");
        }}
      >
        <summary className="list-none cursor-pointer select-none rounded-full ring-1 ring-panel bg-panel-muted px-2 py-0.5 hover:bg-panel focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]">
          <span className="text-subtle">Team:</span>{" "}
          <span className="text-[var(--text)]">{teamLabel}</span>{" "}
          <span className="text-subtle">▾</span>
        </summary>
        <div className="absolute right-0 z-[10000] mt-2 w-72 rounded-xl border border-subtle bg-panel p-2 shadow-lg">
          <p className="px-2 pb-1 text-[10px] uppercase tracking-wide text-subtle">Team</p>

          {teams.length === 0 ? (
            <a
              href={`/programs/${programId}/teams`}
              className="block rounded-lg px-2 py-2 text-sm text-[var(--text)] hover:bg-panel-muted"
            >
              Choose Team
            </a>
          ) : (
            <div className="max-h-64 overflow-auto">
              {teams.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    apply({
                      teamId: t.id,
                      teamName: t.name ?? "Team",
                      seasonId: null,
                      seasonName: null,
                      seasonStatus: null,
                    });
                    teamRef.current?.removeAttribute("open");
                    router.refresh();
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-panel-muted"
                >
                  <span className="text-[var(--text)]">{t.name ?? "Team"}</span>
                  {ctx.teamId === t.id ? <span className="text-subtle">✓</span> : null}
                </button>
              ))}
            </div>
          )}

          <div className="mt-2 border-t border-subtle pt-2">
            <a
              href={`/programs/${programId}/teams`}
              className="block rounded-lg px-2 py-2 text-xs text-subtle hover:bg-panel-muted"
            >
              Manage teams
            </a>
          </div>
        </div>
      </details>

      <span className="text-subtle">·</span>

      <details
        ref={seasonRef}
        className="group relative"
        onToggle={(e) => {
          const el = e.currentTarget;
          if (el.open) closeOthers("season");
        }}
      >
        <summary className="list-none cursor-pointer select-none rounded-full ring-1 ring-panel bg-panel-muted px-2 py-0.5 hover:bg-panel focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]">
          <span className="text-subtle">Season:</span>{" "}
          <span className="text-[var(--text)]">{seasonLabel}</span>{" "}
          {seasonMicro ? (
            <span className="ml-1 rounded-full border border-subtle bg-panel px-2 py-0.5 text-[10px] text-subtle">
              {seasonMicro}
            </span>
          ) : null}{" "}
          <span className="text-subtle">▾</span>
        </summary>
        <div className="absolute right-0 z-[10000] mt-2 w-72 rounded-xl border border-subtle bg-panel p-2 shadow-lg">
          <p className="px-2 pb-1 text-[10px] uppercase tracking-wide text-subtle">Season</p>

          {!ctx.teamId ? (
            <p className="px-2 py-2 text-xs text-subtle">Select a team first.</p>
          ) : seasons.length === 0 ? (
            <a
              href={`/programs/${programId}/teams`}
              className="block rounded-lg px-2 py-2 text-sm text-[var(--text)] hover:bg-panel-muted"
            >
              Choose Season
            </a>
          ) : (
            <div className="max-h-64 overflow-auto">
              {seasons.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    apply({
                      ...ctx,
                      seasonId: s.id,
                      seasonName: s.name ? normalizeSeasonLabel(s.name) : "Season",
                      seasonStatus: s.status ?? null,
                    });
                    seasonRef.current?.removeAttribute("open");
                    router.refresh();
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-panel-muted"
                >
                  <span className="text-[var(--text)]">{s.name ? normalizeSeasonLabel(s.name) : "Season"}</span>
                  {ctx.seasonId === s.id ? <span className="text-subtle">✓</span> : null}
                </button>
              ))}
            </div>
          )}

          <div className="mt-2 border-t border-subtle pt-2">
            <a
              href={`/programs/${programId}/teams`}
              className="block rounded-lg px-2 py-2 text-xs text-subtle hover:bg-panel-muted"
            >
              Manage seasons
            </a>
          </div>
        </div>
      </details>
    </div>
  );
}

const PROGRAM_NAV_GROUPS: ProgramNavGroup[] = [
  {
    id: "analyze",
    label: "Analyze",
    order: 10,
    items: [
      {
        id: "performance",
        label: "Performance",
        href: (ctx) => `/programs/${ctx.programId}/performance`,
        order: 10,
      },
      {
        id: "program_health",
        label: "Program Health",
        href: (ctx) => `/programs/${ctx.programId}/program-health`,
        order: 20,
      },
    ],
  },
  {
    id: "plan",
    label: "Plan",
    order: 20,
    items: [
      {
        id: "recruiting",
        label: "Recruiting",
        href: (ctx) => `/programs/${ctx.programId}/recruiting`,
        order: 10,
      },
      {
        id: "roster_planning",
        label: "Roster Planning",
        href: (ctx) =>
          ctx.teamId
            ? `/programs/${ctx.programId}/teams/${ctx.teamId}/roster-planning`
            : `/programs/${ctx.programId}/teams`,
        isActive: (pathname, ctx) => {
          const base = `/programs/${ctx.programId}`;
          return (
            pathname.includes("/roster-planning") ||
            pathname.includes("/scenarios/") ||
            (pathname.includes("/seasons/") &&
              (pathname.includes("/roster") ||
                pathname.includes("/scholarship-history"))) ||
            pathname.includes("/active-roster") ||
            (pathname.startsWith(`${base}/teams/`) &&
              pathname.includes("/roster-planning"))
          );
        },
        order: 20,
      },
    ],
  },
  {
    id: "manage",
    label: "Manage",
    order: 30,
    items: [
      {
        id: "athletes",
        label: "Athletes",
        href: (ctx) => `/programs/${ctx.programId}/athletes`,
        order: 10,
      },
      {
        id: "training",
        label: "Training",
        href: (ctx) => `/programs/${ctx.programId}/training`,
        order: 20,
      },
      {
        id: "resources",
        label: "Resources",
        href: "#",
        order: 110,
        children: [
          { id: "knowledge", label: "Knowledge", href: "/knowledge", order: 10 },
          { id: "files", label: "Files", href: "/files", order: 20 },
          { id: "media", label: "Media", href: "/media", order: 30 },
          { id: "gear", label: "Gear", href: "/gear", order: 40 },
        ],
      },
    ],
  },
  {
    id: "compete",
    label: "Compete",
    order: 40,
    items: [
      {
        id: "meets",
        label: "Meets",
        href: (ctx) => `/programs/${ctx.programId}/meets`,
        disabled: true,
        badge: "Coming Soon",
        order: 10,
      },
    ],
  },
  {
    id: "administrate",
    label: "Administrate",
    order: 50,
    items: [
      {
        id: "teams",
        label: "Teams",
        href: (ctx) => `/programs/${ctx.programId}/teams`,
        order: 10,
      },
      {
        id: "facilities",
        label: "Facilities",
        href: (ctx) => `/programs/${ctx.programId}/facilities`,
        order: 20,
      },
      {
        id: "staff",
        label: "Staff",
        href: (ctx) => `/programs/${ctx.programId}/staff`,
        order: 30,
      },
      {
        id: "branding",
        label: "Branding",
        href: (ctx) => `/programs/${ctx.programId}/settings/branding`,
        order: 40,
      },
      {
        id: "billing",
        label: "Billing",
        href: (ctx) => `/programs/${ctx.programId}/billing`,
        order: 50,
      },
      {
        id: "account",
        label: "Account",
        href: (ctx) => `/programs/${ctx.programId}/account`,
        order: 60,
      },
    ],
  },
];

function resolveNavHref(item: ProgramNavItem, ctx: ProgramNavContext): string {
  return typeof item.href === "function" ? item.href(ctx) : item.href;
}

function isNavItemActive(
  item: ProgramNavItem,
  pathname: string,
  ctx: ProgramNavContext
): boolean {
  if (item.isActive) return item.isActive(pathname, ctx);
  const href = resolveNavHref(item, ctx);
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ProgramNav() {
  const params = useParams<{ programId: string }>();
  const programId = params?.programId;
  const pathname = usePathname();
  const [navCtx, setNavCtx] = useState<PersistedContext>({});
  const [openGroup, setOpenGroup] = useState<ProgramNavModeId | null>(null);
  const [manageResourcesOpen, setManageResourcesOpen] = useState(false);

  if (!programId) return null;

  useEffect(() => {
    setNavCtx(readCtx(programId));
  }, [programId, pathname]);

  const ctx = useMemo<ProgramNavContext>(
    () => ({ programId, teamId: navCtx.teamId ?? null }),
    [programId, navCtx.teamId]
  );

  const sortedGroups = useMemo(() => {
    return [...PROGRAM_NAV_GROUPS]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((group) => ({
        ...group,
        items: [...group.items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      }));
  }, []);

  const activeGroupId = useMemo(() => {
    for (const group of sortedGroups) {
      if (group.items.some((item) => isNavItemActive(item, pathname, ctx))) {
        return group.id;
      }
    }
    return null;
  }, [sortedGroups, pathname, ctx]);

  useEffect(() => {
    if (openGroup === null && activeGroupId) setOpenGroup(activeGroupId);
  }, [openGroup, activeGroupId]);

  useEffect(() => {
    const manageGroup = sortedGroups.find((group) => group.id === "manage");
    const resourcesItem = manageGroup?.items.find((item) => item.id === "resources");
    const children = resourcesItem?.children ?? [];
    const anyActive = children.some((child) => isNavItemActive(child, pathname, ctx));
    if (anyActive) setManageResourcesOpen(true);
  }, [sortedGroups, pathname, ctx]);

  const dashboardHref = `/programs/${programId}/dashboard`;
  const isDashboardActive =
    pathname === dashboardHref || pathname.startsWith(`${dashboardHref}/`);
  const isProgramHealth = pathname.includes("/program-health");

  return (
    <div className="flex h-full flex-col gap-4 bg-transparent text-[11px]">
      {/* Primary program navigation */}
      <nav className="space-y-1 bg-transparent">
        <Link
          href={dashboardHref}
          className={[
            "glass-pill flex items-center justify-between rounded-lg border border-subtle px-3 py-2 transition-colors",
            isDashboardActive
              ? "glass-pill--brand glass-pill--active"
              : "glass-pill--brand-soft text-muted",
          ].join(" ")}
        >
          <span>Dashboard</span>
          <span className="text-[9px] opacity-60">→</span>
        </Link>

        {sortedGroups.map((group) => {
          const groupIsActive = group.items.some((item) =>
            isNavItemActive(item, pathname, ctx)
          );
          const isOpen = openGroup === group.id;

          return (
            <div key={group.id} className="space-y-1 bg-transparent">
              <button
                type="button"
                onClick={() => setOpenGroup((cur) => (cur === group.id ? null : group.id))}
                className={[
                  "glass-pill flex w-full items-center justify-between rounded-lg border border-subtle px-3 py-2 text-[11px] transition-colors",
                  isOpen || groupIsActive
                    ? "glass-pill--brand glass-pill--active"
                    : "glass-pill--brand-soft text-muted",
                ].join(" ")}
                aria-expanded={isOpen}
              >
                <span>{group.label.toUpperCase()}</span>
                <span className="text-[9px] opacity-60">{isOpen ? "▾" : "▸"}</span>
              </button>

              {isOpen && (
                <div className="space-y-1 pl-3 bg-transparent">
                  {group.items.map((item) => {
                    if (item.disabled) {
                      return (
                        <div
                          key={item.id}
                          className="glass-pill glass-pill--brand-soft flex items-center justify-between rounded-lg border border-subtle px-3 py-2 text-muted opacity-60 cursor-not-allowed"
                        >
                          <span>
                            {item.label}
                            {item.badge ? ` (${item.badge})` : ""}
                          </span>
                          <span className="text-[9px] opacity-60">•</span>
                        </div>
                      );
                    }

                    if (item.children && item.children.length > 0) {
                      const childrenSorted = [...item.children].sort(
                        (a, b) => (a.order ?? 0) - (b.order ?? 0)
                      );
                      const childrenActive = childrenSorted.some((child) =>
                        isNavItemActive(child, pathname, ctx)
                      );
                      const isResources = group.id === "manage" && item.id === "resources";
                      const isOpen = isResources ? manageResourcesOpen : true;

                      return (
                        <div key={item.id} className="space-y-1 bg-transparent">
                          <button
                            type="button"
                            onClick={() => {
                              if (isResources) setManageResourcesOpen((value) => !value);
                            }}
                            className={[
                              "glass-pill flex w-full items-center justify-between rounded-lg border border-subtle px-3 py-2 text-[11px] transition-colors",
                              childrenActive
                                ? "glass-pill--brand glass-pill--active"
                                : "glass-pill--brand-soft text-muted",
                              isResources ? "" : "cursor-default",
                            ].join(" ")}
                            aria-expanded={isOpen}
                          >
                            <span>{item.label}</span>
                            <span className="text-[9px] opacity-60">
                              {isResources ? (isOpen ? "▾" : "▸") : "▾"}
                            </span>
                          </button>

                          {isOpen && (
                            <div className="space-y-1 pl-3 bg-transparent">
                              {childrenSorted.map((child) => {
                                const href = resolveNavHref(child, ctx);
                                const isActive = isNavItemActive(
                                  child,
                                  pathname,
                                  ctx
                                );

                                return (
                                  <Link
                                    key={child.id}
                                    href={href}
                                    className={[
                                      "glass-pill flex items-center justify-between rounded-lg border border-subtle px-3 py-2 transition-colors",
                                      isActive
                                        ? "glass-pill--brand glass-pill--active"
                                        : "glass-pill--brand-soft text-muted",
                                    ].join(" ")}
                                  >
                                    <span>{child.label}</span>
                                    <span className="text-[9px] opacity-60">→</span>
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }

                    const href = resolveNavHref(item, ctx);
                    const isActive = isNavItemActive(item, pathname, ctx);

                    return (
                      <Link
                        key={item.id}
                        href={href}
                        className={[
                          "glass-pill flex items-center justify-between rounded-lg border border-subtle px-3 py-2 transition-colors",
                          isActive
                            ? "glass-pill--brand glass-pill--active"
                            : "glass-pill--brand-soft text-muted",
                        ].join(" ")}
                      >
                        <span>{item.label}</span>
                        <span className="text-[9px] opacity-60">→</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {isProgramHealth ? (
        <div className="mt-auto border-t border-subtle px-3 py-3">
          <ProgramHealthA2OverlayToggle programId={programId} />
        </div>
      ) : null}
    </div>
  );
}
