

// app/programs/[programId]/(athletic)/training/TrainingWorkspaceClient.tsx

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PracticeBuilderModal from "../../teams/[teamId]/(athletic)/seasons/[seasonId]/practice/PracticeBuilderModal";
import { GlassModalShell } from "@/components/ui/GlassModalShell";
import ExercisesClient from "./exercises/ExercisesClient";
import WorkoutsClient from "./workouts/WorkoutsClient";
import {
  GLASS,
  GLASS_SCROLLBAR,
  MutedScrollArea,
  SurfaceShell,
  WorkspacePanel,
} from "@/components/ui/SurfaceShell";

import type { WeeklyWeatherDay } from "@/lib/weather/tomorrow";

export type CalendarEvent = {
  id: string;
  type: "training";
  date: string; // YYYY-MM-DD
  startTime: string | null; // ISO
  endTime: string | null; // ISO
  title: string;
  location: string | null;
  status: "planned" | "published" | "completed" | "canceled";
  teamId: string | null;
  teamLabel: string | null;
  ownerProgramMemberId: string | null;
  isSelectable: boolean; // strict ownership
  // optional future fields
  groupSummary?: { count: number; labels?: string[] };
};

type Props = {
  programId: string;
  /** Current team context (optional). Used when wiring timeslot -> PracticeBuilderModal. */
  teamId?: string | null;
  /** Current season context (team_seasons.id, optional). Used when wiring timeslot -> PracticeBuilderModal. */
  teamSeasonId?: string | null;
  weekFrom: string; // YYYY-MM-DD
  weekTo: string; // YYYY-MM-DD
  events: CalendarEvent[];
  /** If provided, start on this date; otherwise defaults to today. */
  weeklyWeather?: WeeklyWeatherDay[]; // cached (week + next week ok)
  initialSelectedDate?: string;
  /** Optional callback when coach clicks Edit for an owned practice. */
  onEditEvent?: (eventId: string) => void;
  /** Optional callback when coach clicks an empty timeslot to schedule a practice. */
  onCreateAt?: (args: { date: string; startTimeIso: string }) => void;
};

function dateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}


function toLocalNoonFromYMD(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function dateOnlyLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfWeekSundayLocal(d: Date) {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
  const day = copy.getDay(); // 0=Sun
  copy.setDate(copy.getDate() - day);
  return copy;
}

function addDaysLocal(d: Date, days: number) {
  const copy = new Date(d.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

function fmtTime(iso: string | null) {
  if (!iso) return null;
  try {
    const dt = new Date(iso);
    return dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  } catch {
    return null;
  }
}

function minutesSinceMidnightLocal(iso: string) {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function snapToHalfHour(minutes: number) {
  return Math.floor(minutes / 30) * 30;
}

function isoForLocalDateAndMinutes(dateStr: string, minutes: number) {
  const [y, m, d] = dateStr.split("-").map((n) => parseInt(n, 10));
  const hh = Math.floor(minutes / 60);
  const mm = minutes % 60;
  // Local time; Date will convert to ISO with timezone offset.
  const local = new Date(y, m - 1, d, hh, mm, 0, 0);
  return local.toISOString();
}

function pickDefaultOwnedEventForDay(events: CalendarEvent[], now: Date) {
  const owned = events.filter((e) => e.isSelectable);
  if (owned.length === 0) return null;

  const withStart = owned
    .filter((e) => e.startTime)
    .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));

  if (withStart.length === 0) return owned[0] ?? null;

  // Next-starting if any start >= now
  const next = withStart.find((e) => new Date(e.startTime as string).getTime() >= now.getTime());
  if (next) return next;

  // Else last-started
  return withStart[withStart.length - 1] ?? null;
}

function statusLabel(s: CalendarEvent["status"]) {
  switch (s) {
    case "planned":
      return "Planned";
    case "published":
      return "Published";
    case "completed":
      return "Completed";
    case "canceled":
      return "Canceled";
    default:
      return s;
  }
}

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function StatusBadge({ status }: { status: CalendarEvent["status"] }) {
  return (
    <span className="shrink-0 rounded-full ring-1 ring-panel bg-panel-muted px-2 py-0.5 text-[10px] text-[var(--muted-foreground)]">
      {statusLabel(status)}
    </span>
  );
}

function iconForTomorrowCode(code: number | null | undefined) {
  if (code == null) return "⛅️";
  if (code === 0 || code === 1000) return "☀️";
  if (code === 1001 || code === 1102) return "☁️";
  if (code === 1100 || code === 1101) return "⛅️";
  if (code >= 2000 && code < 3000) return "🌫️";
  if (code >= 4000 && code < 5000) return "🌦️";
  if (code >= 5000 && code < 6000) return "🌧️";
  if (code >= 6000 && code < 7000) return "🌨️";
  if (code >= 7000 && code < 8000) return "❄️";
  if (code >= 8000 && code < 9000) return "⛈️";
  return "⛅️";
}

function heatRiskUi(risk: string | null | undefined) {
  const r = String(risk ?? "").toLowerCase();
  switch (r) {
    case "low":
      return {
        label: "Low",
        className: "border-emerald-600/70 bg-emerald-500/5 text-emerald-200",
      };
    case "moderate":
      return {
        label: "Moderate",
        className: "border-yellow-600/70 bg-yellow-500/5 text-yellow-200",
      };
    case "high":
      return {
        label: "High",
        className: "border-orange-600/70 bg-orange-500/5 text-orange-200",
      };
    case "extreme":
      return {
        label: "Extreme",
        className: "border-red-700/70 bg-red-500/5 text-red-200",
      };
    default:
      return {
        label: "Unknown",
        className:
          "border-[var(--border)]/50 bg-panel text-[var(--muted-foreground)]",
      };
  }
}

export default function TrainingWorkspaceClient({
  programId,
  teamId,
  teamSeasonId,
  weekFrom,
  weekTo,
  events,
  weeklyWeather,
  initialSelectedDate,
  onEditEvent,
  onCreateAt,
}: Props) {
  // Use LOCAL date keys for all UI state + comparisons so they match `events[].date` (YYYY-MM-DD).
  const today = useMemo(() => dateOnlyLocal(new Date()), []);

  const [selectedDate, setSelectedDate] = useState<string>(initialSelectedDate ?? today);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isWeatherExpanded, setIsWeatherExpanded] = useState(false);

  const weatherByDate = useMemo(() => {
    const m = new Map<string, WeeklyWeatherDay>();
    for (const d of weeklyWeather ?? []) {
      if (d?.dateIso) m.set(d.dateIso, d);
    }
    return m;
  }, [weeklyWeather]);

  const selectedDayWeather = useMemo(() => {
    // selectedDate is YYYY-MM-DD in local terms; cached weather may be keyed by either local or UTC date.
    const localKey = selectedDate;
    let utcKey = localKey;
    try {
      utcKey = new Date(`${localKey}T12:00:00`).toISOString().slice(0, 10);
    } catch {
      // ignore
    }
    return weatherByDate.get(localKey) ?? weatherByDate.get(utcKey) ?? null;
  }, [weatherByDate, selectedDate]);

  const router = useRouter();

  type WeekScope = "team" | "program";
  const [weekScope, setWeekScope] = useState<WeekScope>("team");

  // client-owned week start (Sun) for smooth navigation
const [weekStartLocal, setWeekStartLocal] = useState<Date>(() => {
  // If we deep-link to a date, anchor the week to that.
  if (initialSelectedDate) {
    return startOfWeekSundayLocal(toLocalNoonFromYMD(initialSelectedDate));
  }
  // Otherwise, always start on the current local week.
  return startOfWeekSundayLocal(new Date());
});

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, idx) => addDaysLocal(weekStartLocal, idx));
  }, [weekStartLocal]);

  const weekFromLocal = useMemo(() => dateOnlyLocal(weekDays[0] ?? weekStartLocal), [weekDays, weekStartLocal]);
  const weekToLocal = useMemo(() => dateOnlyLocal(weekDays[6] ?? addDaysLocal(weekStartLocal, 6)), [weekDays, weekStartLocal]);

  const handlePrevWeek = useCallback(() => setWeekStartLocal((d) => addDaysLocal(d, -7)), []);
  const handleNextWeek = useCallback(() => setWeekStartLocal((d) => addDaysLocal(d, 7)), []);
  const handleThisWeek = useCallback(() => setWeekStartLocal(startOfWeekSundayLocal(new Date())), []);

  const visibleWeekKeys = useMemo(() => weekDays.map((d) => dateOnlyLocal(d)), [weekDays]);

  // Practice builder modal state (create)
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [builderDateIso, setBuilderDateIso] = useState<string>(() => today);
  const [builderInitialStartTimeIso, setBuilderInitialStartTimeIso] = useState<string | undefined>(undefined);

  const builderDisplayDate = useMemo(() => {
    try {
      const [y, m, d] = builderDateIso.split("-").map((n) => parseInt(n, 10));
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    } catch {
      return builderDateIso;
    }
  }, [builderDateIso]);

  function openBuilderForTimeslot(dateIso: string, initialStartTimeIso?: string) {
    setBuilderDateIso(dateIso);
    setBuilderInitialStartTimeIso(initialStartTimeIso);
    setIsBuilderOpen(true);
  }

  const canOpenBuilderFromTimeslot = Boolean(teamId && teamSeasonId);

  // If parent supplies onCreateAt, use it. Otherwise, open PracticeBuilderModal when possible.
  const effectiveOnCreateAt = onCreateAt ??
    (canOpenBuilderFromTimeslot
      ? ((args: { date: string; startTimeIso: string }) =>
          openBuilderForTimeslot(args.date, args.startTimeIso))
      : undefined);

  type ToolModal = "exercises" | "workouts" | "logs" | null;
  const [openToolModal, setOpenToolModal] = useState<ToolModal>(null);

  function closeToolModal() {
    setOpenToolModal(null);
  }

  function openTool(name: Exclude<ToolModal, null>) {
    setOpenToolModal(name);
  }

  function toolTitle(name: Exclude<ToolModal, null>) {
    switch (name) {
      case "exercises":
        return "Exercise library";
      case "workouts":
        return "Workout library";
      case "logs":
        return "Athlete training logs";
    }
  }

  function ToolModalShell({
    open,
    title,
    onClose,
    children,
  }: {
    open: boolean;
    title: string;
    onClose: () => void;
    children: React.ReactNode;
  }) {
    // Delegate chrome/overlay/escape handling to the shared shell for consistent UX.
    // Cast props to `any` to avoid coupling this file to the exact shell prop names.
    return (
      <GlassModalShell {...({ open, title, onClose } as any)}>
        <div className="max-h-[75vh] overflow-auto p-5">{children}</div>
      </GlassModalShell>
    );
  }



  // Keep the selected day inside the currently displayed client week.
  useEffect(() => {
    if (visibleWeekKeys.includes(selectedDate)) return;

    const todayKey = dateOnlyLocal(new Date());
    const next = visibleWeekKeys.includes(todayKey) ? todayKey : visibleWeekKeys[0] ?? today;
    setSelectedDate(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekFromLocal, weekToLocal]);

  // If the parent provides a new initialSelectedDate (e.g. deep-link), navigate the weekly view to that week
  // and select the day using the same soft transition.
  useEffect(() => {
    if (!initialSelectedDate) return;

    // Move the client week to the selected day.
    try {
      const nextDate = toLocalNoonFromYMD(initialSelectedDate);
      setWeekStartLocal(startOfWeekSundayLocal(nextDate));
    } catch {
      // ignore parse errors
    }

    if (initialSelectedDate === selectedDate) return;

    setIsTransitioning(true);
    window.setTimeout(() => {
      setSelectedDate(initialSelectedDate);
      window.setTimeout(() => setIsTransitioning(false), 140);
    }, 120);
  }, [initialSelectedDate]);

  // Program-wide visibility for the daily agenda/details (strict ownership only controls selectability).
  const agendaEventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
        if (e.type !== "training") continue;

        const key = eventLocalDateKey(e);
        if (!key) continue;

        const list = map.get(key) ?? [];
        list.push(e);
        map.set(key, list);
    }

    for (const [k, list] of map.entries()) {
        list.sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
        map.set(k, list);
    }
    return map;
    }, [events]);

  // Scoped visibility for the weekly calendar surface only.
  const weeklyEventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();

    const scoped =
        weekScope === "program"
        ? events
        : events.filter((e) => (teamId ? e.teamId === teamId : true));

    for (const e of scoped) {
        if (e.type !== "training") continue;

        const key = eventLocalDateKey(e);
        if (!key) continue;

        const list = map.get(key) ?? [];
        list.push(e);
        map.set(key, list);
    }

    for (const [k, list] of map.entries()) {
        list.sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
        map.set(k, list);
    }
    return map;
    }, [events, weekScope, teamId]);

  const dayEvents = useMemo(() => agendaEventsByDate.get(selectedDate) ?? [], [agendaEventsByDate, selectedDate]);

  const defaultEventForDay = useMemo(() => {
    return pickDefaultOwnedEventForDay(dayEvents, new Date());
  }, [dayEvents]);

  // Keep the right panel occupied: if selection is missing or not in day, reset to default.
  useEffect(() => {
    const ownedForDay = dayEvents.filter((e) => e.isSelectable);
    const current = selectedEventId ? dayEvents.find((e) => e.id === selectedEventId) : null;

    if (ownedForDay.length === 0) {
      setSelectedEventId(null);
      return;
    }

    if (!current || !current.isSelectable) {
      setSelectedEventId(defaultEventForDay?.id ?? ownedForDay[0]?.id ?? null);
    }
  }, [dayEvents, defaultEventForDay, selectedEventId]);

  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return dayEvents.find((e) => e.id === selectedEventId) ?? null;
  }, [dayEvents, selectedEventId]);

  // Timeline geometry (fixed zoom): 5:00 → 21:00 with half-hour lines
  const DAY_START_MIN = 5 * 60;
  const DAY_END_MIN = 21 * 60;
  const MINUTES_PER_HALF_HOUR = 30;
  const HALF_HOUR_PX = 22.5; // ~25% more spacing (was 18)
  const TOTAL_MIN = DAY_END_MIN - DAY_START_MIN;
  const TOTAL_HALF_HOURS = Math.ceil(TOTAL_MIN / MINUTES_PER_HALF_HOUR);
  const TIMELINE_HEIGHT = TOTAL_HALF_HOURS * HALF_HOUR_PX;

  function yForIso(iso: string | null) {
    if (!iso) return null;
    const mins = minutesSinceMidnightLocal(iso);
    const rel = clamp(mins - DAY_START_MIN, 0, TOTAL_MIN);
    const halfHours = rel / MINUTES_PER_HALF_HOUR;
    return halfHours * HALF_HOUR_PX;
  }

  function heightForEvent(e: CalendarEvent) {
    if (!e.startTime) return 36; // default block height for TBD
    const startMins = minutesSinceMidnightLocal(e.startTime);
    const endMins = e.endTime ? minutesSinceMidnightLocal(e.endTime) : startMins + 60;
    const dur = clamp(endMins - startMins, 20, TOTAL_MIN);
    return (dur / MINUTES_PER_HALF_HOUR) * HALF_HOUR_PX;
  }

  function handleSelectDay(nextDate: string) {
    if (nextDate === selectedDate) return;

    const nextDayEvents = agendaEventsByDate.get(nextDate) ?? [];
    const nextDefault = pickDefaultOwnedEventForDay(nextDayEvents, new Date());

    setIsTransitioning(true);
    window.setTimeout(() => {
        setSelectedDate(nextDate);
        setSelectedEventId(nextDefault?.id ?? null);
        window.setTimeout(() => setIsTransitioning(false), 140);
    }, 120);
  }

  function eventLocalDateKey(e: CalendarEvent) {
    // Always prefer the explicit YYYY-MM-DD provided by the server.
    // Using startTime can shift dates due to timezone offsets.
    if (e.date) return e.date;

    // Fallback only if date is missing for some reason.
    if (e.startTime) return dateOnlyLocal(new Date(e.startTime));

    return null;
  }

  function schedulePracticeAtMinutes(rawMinutes: number) {
    if (!effectiveOnCreateAt) return;

    const snapped = snapToHalfHour(rawMinutes);
    const clamped = clamp(snapped, DAY_START_MIN, DAY_END_MIN);

    const startTimeIso = isoForLocalDateAndMinutes(selectedDate, clamped);
    effectiveOnCreateAt({ date: selectedDate, startTimeIso });
  }

  function handleTimelineEmptyClick(ev: React.MouseEvent<HTMLDivElement>) {
    if (!effectiveOnCreateAt) return;

    // If click originated from a button (existing event), ignore.
    const target = ev.target as HTMLElement | null;
    if (target && target.closest("button")) return;

    const rect = (ev.currentTarget as HTMLDivElement).getBoundingClientRect();
    const y = ev.clientY - rect.top;

    // Convert y back to minutes since DAY_START_MIN (30-min increments)
    const halfHours = y / HALF_HOUR_PX;
    const minutesFromStart = halfHours * MINUTES_PER_HALF_HOUR;
    const rawMinutes = DAY_START_MIN + minutesFromStart;

    schedulePracticeAtMinutes(rawMinutes);
  }


  return (
    <div className="space-y-4" data-program-id={programId}>
      {/* Actions */}
      <div className="relative z-10 -mt-12 mb-3 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => openTool("exercises")}
          className="rounded-full ring-1 ring-panel bg-panel/70 px-4 py-2 text-[11px] font-semibold text-[var(--foreground)] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-panel-muted"
        >
          Exercises
        </button>
        <button
          type="button"
          onClick={() => openTool("workouts")}
          className="rounded-full ring-1 ring-panel bg-panel/70 px-4 py-2 text-[11px] font-semibold text-[var(--foreground)] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-panel-muted"
        >
          Workouts
        </button>
        <button
          type="button"
          onClick={() => openTool("logs")}
          className="rounded-full ring-1 ring-panel bg-panel/70 px-4 py-2 text-[11px] font-semibold text-[var(--foreground)] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-panel-muted"
        >
          Athlete logs
        </button>
      </div>
      {/* Daily workspace: 2 columns */}
      <div className="grid gap-4 lg:grid-cols-2">
        <WorkspacePanel className="max-h-[45vh]">
          {/* Left: full-day timeline agenda */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-[var(--foreground)]">
                Agenda <span className="text-[var(--muted-foreground)]">–</span>{" "}
                <span className="font-semibold">
                  {(() => {
                    try {
                      const [y, m, d] = selectedDate
                        .split("-")
                        .map((n) => parseInt(n, 10));
                      const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
                      return dt.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      });
                    } catch {
                      return selectedDate;
                    }
                  })()}
                </span>
              </p>
            </div>
          </div>

          {effectiveOnCreateAt ? (
            <p className="mt-2 text-[10px] text-[var(--muted-foreground)]">
              Tip: click an empty time slot to schedule practice.
            </p>
          ) : null}

          <MutedScrollArea className="mt-4">
            {/* Timeline canvas */}
            <div
              className={cn("relative", effectiveOnCreateAt && "cursor-crosshair")}
              style={{ height: TIMELINE_HEIGHT }}
              onClick={handleTimelineEmptyClick}
              role={effectiveOnCreateAt ? "button" : undefined}
              aria-label={effectiveOnCreateAt ? "Schedule practice" : undefined}
            >
              {/* Hoverable 30-min targets (behind events) */}
              {effectiveOnCreateAt ? (
                <div className="absolute left-14 right-0 top-0 z-0">
                  {Array.from({ length: TOTAL_HALF_HOURS }).map((_, i) => {
                    const minutes = DAY_START_MIN + i * MINUTES_PER_HALF_HOUR;
                    const hour = Math.floor(minutes / 60);
                    const minute = minutes % 60;
                    const label = new Date(0, 0, 0, hour, minute).toLocaleTimeString(
                      "en-US",
                      { hour: "numeric", minute: "2-digit" },
                    );

                    return (
                      <button
                        key={`slot-${i}`}
                        type="button"
                        className={cn(
                          "absolute left-0 right-0",
                          "rounded-md",
                          "transition-all duration-150",
                          "hover:-translate-y-[2px]",
                          "hover:bg-[var(--brand)]/14",
                          "hover:ring-1 hover:ring-[var(--brand)]/45",
                          "hover:shadow-[0_10px_22px_rgba(0,0,0,0.30)]",
                          "active:-translate-y-[1px]",
                          "active:bg-[var(--brand)]/18",
                          "focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/45",
                        )}
                        style={{
                          top: i * HALF_HOUR_PX + HALF_HOUR_PX / 2.5,
                          height: HALF_HOUR_PX - 2,
                          zIndex: 1,
                        }}
                        title={`Schedule practice at ${label}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          schedulePracticeAtMinutes(minutes);
                        }}
                        aria-label={`Schedule practice at ${label}`}
                      />
                    );
                  })}
                </div>
              ) : null}

              {/* Lines */}
              {Array.from({ length: TOTAL_HALF_HOURS - 1 }).map((_, i) => {
                const minutes = DAY_START_MIN + i * MINUTES_PER_HALF_HOUR;
                const isHour = minutes % 60 === 0;
                const y = i * HALF_HOUR_PX;
                const hour = Math.floor(minutes / 60);
                const label = isHour
                  ? new Date(0, 0, 0, hour, 0).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : null;

                return (
                  <div key={i} className="absolute left-0 right-0" style={{ top: y }}>
                    <div className="flex items-center gap-2">
                      <div className="w-14 shrink-0 text-right font-mono text-[10px] text-[var(--muted-foreground)]">
                        <span className="inline-flex items-center justify-end gap-1">
                          <span className="inline-flex w-3 justify-center" aria-hidden="true" />
                          <span>{label ? label.replace(":00", "") : ""}</span>
                        </span>
                      </div>
                      <div
                        className={cn(
                          "h-px flex-1",
                          isHour ? "bg-[var(--border)]" : "bg-[var(--border)]/60",
                        )}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Now marker (today only): blue arrow aligned to actual minute */}
              {selectedDate === today
                ? (() => {
                    const mins = new Date().getHours() * 60 + new Date().getMinutes();
                    const rel = mins - DAY_START_MIN;
                    if (rel < 0 || rel > TOTAL_MIN) return null;
                    const y = (rel / MINUTES_PER_HALF_HOUR) * HALF_HOUR_PX;
                    return (
                      <div className="absolute left-0" style={{ top: y - 6 }} aria-hidden="true">
                        <div className="w-14 shrink-0 text-right font-mono text-[10px]">
                          <span className="inline-flex w-3 justify-center text-sky-400">▶</span>
                        </div>
                      </div>
                    );
                  })()
                : null}

              {/* Events */}
              <div className="absolute left-16 right-0 top-1 bottom-0 z-10 min-w-0">
                {dayEvents.length === 0 ? (
                  <div className="mt-2 rounded-lg ring-1 ring-panel bg-panel px-3 py-2 text-[11px] text-[var(--muted-foreground)]">
                    No scheduled training for today.
                  </div>
                ) : (
                  dayEvents.map((e) => {
                    const top = yForIso(e.startTime) ?? 8;
                    const height = heightForEvent(e);

                    // Non-owned: text-only aligned to time
                    if (!e.isSelectable) {
                      const time = e.startTime
                        ? `${fmtTime(e.startTime)}${e.endTime ? `–${fmtTime(e.endTime)}` : ""}`
                        : "Time TBD";

                      return (
                        <div key={e.id} className="absolute left-2 right-3" style={{ top, height }}>
                          <div className="min-w-0 overflow-hidden px-2 py-2 text-[11px] text-[var(--muted-foreground)]">
                            <p className="min-w-0 truncate whitespace-nowrap font-semibold text-[var(--foreground)]/70">
                              {e.teamLabel ? `${e.teamLabel} · ` : ""}
                              {e.title}
                              {" · "}
                              {time}
                              {e.location ? ` · ${e.location}` : ""}
                            </p>
                          </div>
                        </div>
                      );
                    }

                    const isSelected = e.id === selectedEventId;
                    const time = e.startTime
                      ? `${fmtTime(e.startTime)}${e.endTime ? `–${fmtTime(e.endTime)}` : ""}`
                      : "Time TBD";

                    const groupsLine = e.groupSummary?.labels?.length
                      ?
                          e.groupSummary.labels.slice(0, 2).join(", ") +
                          (e.groupSummary.labels.length > 2 ? " …" : "")
                      : e.groupSummary?.count
                        ? `${e.groupSummary.count} groups`
                        : null;

                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => setSelectedEventId(e.id)}
                        className={cn(
                          "absolute left-2 right-3 min-w-0 overflow-hidden text-left",
                          "rounded-lg ring-1 ring-panel bg-panel",
                          "px-3 py-2.5",
                          "transition-colors",
                          "hover:bg-panel-muted",
                          isSelected && "outline outline-1 outline-[var(--foreground)]/15",
                        )}
                        style={{ top, height }}
                        aria-pressed={isSelected}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="min-w-0 flex-1 truncate whitespace-nowrap text-[11px] font-semibold text-[var(--foreground)]">
                            {e.title}
                          </p>
                          <div className="shrink-0">
                            <StatusBadge status={e.status} />
                          </div>
                        </div>

                        <p className="mt-1 min-w-0 truncate whitespace-nowrap text-[11px] text-[var(--muted-foreground)]">
                          {time}
                          {e.location ? ` · ${e.location}` : ""}
                          {groupsLine ? ` · ${groupsLine}` : ""}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </MutedScrollArea>
        </WorkspacePanel>

        <WorkspacePanel className="max-h-[45vh]">
          {/* Right: details panel for selected (owned) event */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-[var(--foreground)]">Details</p>
            </div>
            {selectedEvent ? <StatusBadge status={selectedEvent.status} /> : null}
          </div>

          <div className={cn("mt-4 space-y-3 flex-1 min-h-0 overflow-y-auto pr-1", GLASS_SCROLLBAR)}>
            {/* Collapsible Weather header (selected day) */}
            {(() => {
              const w = selectedDayWeather;
              const icon = iconForTomorrowCode(w?.weatherCode);
              const risk = heatRiskUi(w?.heatRisk);

              const dayLabel = (() => {
                try {
                  const [y, m, d] = selectedDate.split("-").map((n) => parseInt(n, 10));
                  const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
                  return dt.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  });
                } catch {
                  return selectedDate;
                }
              })();

              const hasWeather = Boolean(w);

              return (
                <div
                  className={cn(
                    "rounded-lg border ring-1 ring-panel",
                    risk.className,
                    !hasWeather && "bg-panel",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setIsWeatherExpanded((v) => !v)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left",
                      "hover:bg-panel-muted/20 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/35",
                    )}
                    aria-expanded={isWeatherExpanded}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px]" aria-hidden="true">
                          {icon}
                        </span>
                        <p className="truncate text-[11px] font-semibold text-[var(--foreground)]">
                          Weather · {dayLabel}
                        </p>
                        <span className="rounded-full ring-1 ring-panel bg-panel px-2 py-0.5 text-[10px]">
                          {risk.label}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[var(--muted-foreground)]">
                        <span>
                          Wet bulb: {w?.wetBulbF != null ? `${w.wetBulbF.toFixed(1)}°F` : "—"}
                        </span>
                        <span>
                          Temp:{" "}
                          {w?.tempMinF != null && w?.tempMaxF != null
                            ? `${w.tempMinF.toFixed(0)}–${w.tempMaxF.toFixed(0)}°F`
                            : "—"}
                        </span>
                        <span>
                          Wind: {w?.windMph != null ? `${w.windMph.toFixed(0)} mph` : "—"}
                        </span>
                        <span className="truncate">{w?.summary ?? "—"}</span>
                      </div>
                    </div>

                    <span className="shrink-0 rounded-full ring-1 ring-panel bg-panel-muted px-2 py-0.5 text-[10px] text-[var(--muted-foreground)]">
                      {isWeatherExpanded ? "Hide" : "Show"}
                    </span>
                  </button>

                  {isWeatherExpanded ? (
                    <div className="border-t border-[var(--border)]/40 px-3 py-2">
                      {!hasWeather ? (
                        <div className="text-[10px] text-[var(--muted-foreground)]">
                          No cached weather available for this day.
                        </div>
                      ) : (
                        <div className="grid gap-2 text-[10px] text-[var(--muted-foreground)]">
                          <div>
                            Heat risk:{" "}
                            <span className="font-semibold text-[var(--foreground)]">{risk.label}</span>
                          </div>
                          <div>
                            Wet bulb: {w?.wetBulbF != null ? `${w.wetBulbF.toFixed(1)}°F` : "—"}
                          </div>
                          <div>
                            Temperature:{" "}
                            {w?.tempMinF != null && w?.tempMaxF != null
                              ? `${w.tempMinF.toFixed(0)}–${w.tempMaxF.toFixed(0)}°F`
                              : "—"}
                          </div>
                          <div>
                            Wind: {w?.windMph != null ? `${w.windMph.toFixed(0)} mph` : "—"}
                          </div>
                          <div>Conditions: {w?.summary ?? "—"}</div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })()}

            {!selectedEvent ? (
              <div className="rounded-lg ring-1 ring-panel bg-panel px-3 py-2 text-[11px] text-[var(--muted-foreground)]">
                No scheduled training for today.
              </div>
            ) : (
              <>
                <div className="rounded-lg ring-1 ring-panel bg-panel px-3 py-2">
                  <p className="text-[11px] font-semibold text-[var(--foreground)]">{selectedEvent.title}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                    {selectedEvent.startTime
                      ? `${fmtTime(selectedEvent.startTime)}${selectedEvent.endTime ? `–${fmtTime(selectedEvent.endTime)}` : ""}`
                      : "Time TBD"}
                    {selectedEvent.location ? ` · ${selectedEvent.location}` : ""}
                  </p>
                  {selectedEvent.teamLabel ? (
                    <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">{selectedEvent.teamLabel}</p>
                  ) : null}
                </div>

                <div className="rounded-lg ring-1 ring-panel bg-panel px-3 py-2 text-[11px] text-[var(--muted-foreground)]">
                  Practice brief: groups, assignments, weather, and notes will render here.
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onEditEvent?.(selectedEvent.id)}
                    disabled={!onEditEvent}
                    className={cn(
                      "inline-flex items-center rounded-full ring-1 ring-panel px-3 py-1.5 text-[11px] font-medium",
                      onEditEvent
                        ? "bg-panel-muted text-[var(--foreground)] hover:bg-panel"
                        : "bg-panel-muted/60 text-[var(--muted-foreground)] cursor-not-allowed",
                    )}
                  >
                    Edit
                  </button>
                </div>
              </>
            )}
          </div>
        </WorkspacePanel>
      </div>

      <SurfaceShell>
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-3">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Week of <span className="font-semibold text-[var(--foreground)]">{weekFromLocal}</span> –{" "}
              <span className="font-semibold text-[var(--foreground)]">{weekToLocal}</span>
            </h2>
            <p className="text-xs text-[var(--muted-foreground)]">Click a day to populate the Agenda.</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="mr-2 inline-flex items-center gap-1 rounded-lg bg-panel-muted/35 p-1 ring-1 ring-white/10">
              <button
                type="button"
                onClick={() => setWeekScope("team")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-medium",
                  weekScope === "team" ? "bg-panel/70 text-[var(--foreground)] ring-1 ring-white/10" : "text-[var(--muted-foreground)] hover:bg-panel/40",
                )}
              >
                Team
              </button>
              <button
                type="button"
                onClick={() => setWeekScope("program")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-medium",
                  weekScope === "program" ? "bg-panel/70 text-[var(--foreground)] ring-1 ring-white/10" : "text-[var(--muted-foreground)] hover:bg-panel/40",
                )}
              >
                Program
              </button>
            </div>

            <button type="button" onClick={handlePrevWeek} className="rounded-lg bg-panel-muted/35 px-3 py-2 text-[11px] font-medium ring-1 ring-white/10 hover:bg-panel-muted/50">
              ‹ Prev
            </button>
            <button type="button" onClick={handleThisWeek} className="rounded-lg bg-panel-muted/35 px-3 py-2 text-[11px] font-medium ring-1 ring-white/10 hover:bg-panel-muted/50">
              This week
            </button>
            <button type="button" onClick={handleNextWeek} className="rounded-lg bg-panel-muted/35 px-3 py-2 text-[11px] font-medium ring-1 ring-white/10 hover:bg-panel-muted/50">
              Next ›
            </button>
          </div>
        </div>



        <div className={cn("rounded-xl", GLASS.chromeSoft)}>
          <div className="grid grid-cols-1 divide-y divide-[var(--border)]/40 md:grid-cols-7 md:divide-y-0 md:divide-x">
            {weekDays.map((dayDate) => {
              const dayKey = dateOnlyLocal(dayDate);
              const dayLabel = dayDate.toLocaleDateString("en-US", { weekday: "short" });
              const dayNum = dayDate.getDate();
              const isToday = dayKey === dateOnlyLocal(new Date());
              const isSelected = dayKey === selectedDate;

              const dayList = weeklyEventsByDate.get(dayKey) ?? [];

              return (
                <div key={dayKey} className={cn("flex flex-col", isSelected && "bg-panel/20")}>
                  <button
                    type="button"
                    onClick={() => handleSelectDay(dayKey)}
                    className={cn(
                      "flex items-center justify-between border-b border-[var(--border)]/40 px-2 py-1.5 text-left",
                      "hover:bg-panel-muted/30 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/35",
                      isToday ? "border-[var(--brand)]/50 bg-[var(--brand)]/10" : "border-[var(--border)]/50 bg-panel",
                      isSelected && "outline outline-1 outline-[var(--foreground)]/15",
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">{dayLabel}</span>
                      <span className="text-sm font-semibold text-[var(--foreground)]">{dayNum}</span>
                    </div>
                    {isToday ? (
                      <span className="rounded-full bg-[var(--brand)]/14 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide text-[var(--foreground)] ring-1 ring-[var(--brand)]/45">
                        Today
                      </span>
                    ) : null}
                  </button>

                  <div className="flex-1 px-2 py-2">
                    {dayList.length === 0 ? (
                      <div className="mt-2 text-[10px] text-[var(--muted-foreground)]">No items.</div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {dayList.slice(0, 8).map((e) => {
                          const timeLabel = e.startTime
                            ? `${fmtTime(e.startTime)}${e.endTime ? `–${fmtTime(e.endTime)}` : ""}`
                            : "Time TBD";

                          return (
                            <div
                              key={e.id}
                              className={cn(
                                "rounded-lg border px-2.5 py-2",
                                e.isSelectable
                                  ? "border-[var(--brand)]/35 bg-panel-muted/35"
                                  : "border-[var(--border)]/40 bg-panel/25",
                              )}
                            >
                              <div className="truncate text-[11px] font-semibold text-[var(--foreground)]">
                                {e.teamLabel ? `${e.teamLabel} · ` : ""}
                                {e.title}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-[var(--muted-foreground)]">
                                <span>{timeLabel}</span>
                                {e.location ? <span>• {e.location}</span> : null}
                              </div>
                            </div>
                          );
                        })}

                        {dayList.length > 8 ? (
                          <div className="rounded-lg border border-[var(--border)]/40 bg-panel/20 px-2.5 py-2 text-[10px] text-[var(--muted-foreground)]">
                            +{dayList.length - 8} more
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      {/* Weather strip (cached) */}
      <div className={cn("mt-4 rounded-xl p-3", GLASS.chromeSoft)}>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-[var(--foreground)]">Weather</p>
          <p className="text-[11px] text-[var(--muted-foreground)]">Click a day for details.</p>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
          {weekDays.map((dayDate) => {
            const dateIsoLocal = dateOnlyLocal(dayDate);
            const dateIsoUtc = dayDate.toISOString().slice(0, 10);
            const dayLabel = dayDate.toLocaleDateString("en-US", { weekday: "short" });

            const w = weatherByDate.get(dateIsoLocal) ?? weatherByDate.get(dateIsoUtc);
            const icon = iconForTomorrowCode(w?.weatherCode);
            const risk = heatRiskUi(w?.heatRisk);

            return (
              <div key={`wx-${dateIsoLocal}`} className={cn("rounded-md border px-2 py-1.5", risk.className)}>
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px]" aria-hidden="true">
                      {icon}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide">{dayLabel}</span>
                  </div>
                  <span className="rounded-full ring-1 ring-panel bg-panel px-2 py-0.5 text-[10px]">{risk.label}</span>
                </div>

                <div className="space-y-0.5 text-[10px]">
                  <div>Wet bulb: {w?.wetBulbF != null ? `${w.wetBulbF.toFixed(1)}°F` : "—"}</div>
                  <div>
                    Temp:{" "}
                    {w?.tempMinF != null && w?.tempMaxF != null
                      ? `${w.tempMinF.toFixed(0)}–${w.tempMaxF.toFixed(0)}°F`
                      : "—"}
                  </div>
                  <div>Wind: {w?.windMph != null ? `${w.windMph.toFixed(0)} mph` : "—"}</div>
                  <div>Conditions: {w?.summary ?? "—"}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </SurfaceShell>

      <ToolModalShell
        open={openToolModal === "exercises"}
        title={toolTitle("exercises")}
        onClose={closeToolModal}
      >
        <ExercisesClient programId={programId} />
      </ToolModalShell>

      <ToolModalShell
        open={openToolModal === "workouts"}
        title={toolTitle("workouts")}
        onClose={closeToolModal}
      >
        <WorkoutsClient programId={programId} />
      </ToolModalShell>

      <ToolModalShell
        open={openToolModal === "logs"}
        title={toolTitle("logs")}
        onClose={closeToolModal}
      >
        <div className="space-y-4">
          <div className="rounded-xl ring-1 ring-panel bg-panel px-4 py-3">
            <p className="text-[12px] font-semibold text-[var(--foreground)]">Athlete training logs</p>
            <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
              This module hasn’t been built yet. This modal is the dedicated home for it so coaches can review logs without leaving the Training context.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl ring-1 ring-panel bg-panel px-4 py-3">
              <p className="text-[11px] font-semibold text-[var(--foreground)]">Filters</p>
              <div className="mt-2 space-y-2 text-[11px] text-[var(--muted-foreground)]">
                <div className="rounded-lg ring-1 ring-panel bg-panel-muted px-3 py-2">Date range (week / month / custom)</div>
                <div className="rounded-lg ring-1 ring-panel bg-panel-muted px-3 py-2">Athlete (search / roster filter)</div>
                <div className="rounded-lg ring-1 ring-panel bg-panel-muted px-3 py-2">Category (run / gym / cross / other)</div>
              </div>
            </div>

            <div className="md:col-span-2 rounded-xl ring-1 ring-panel bg-panel px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold text-[var(--foreground)]">Log viewer</p>
                  <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                    Planned: timeline table + per-athlete drill-in + compliance metrics.
                  </p>
                </div>
                <span className="rounded-full ring-1 ring-panel bg-panel-muted px-2 py-0.5 text-[10px] text-[var(--muted-foreground)]">
                  Coming soon
                </span>
              </div>

              <div className="mt-3 rounded-lg ring-1 ring-panel bg-panel-muted px-4 py-6 text-center">
                <p className="text-[12px] font-semibold text-[var(--foreground)]">No log viewer yet</p>
                <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                  We’ll build this on top of <span className="font-mono">athlete_training_sessions</span> (coach assigned + self assigned) with program-wide visibility and strict edit permissions.
                </p>
                <p className="mt-3 text-[11px] text-[var(--muted-foreground)]">
                  Next build: API route to fetch sessions by date range + athlete, then a client viewer with quick drill-in.
                </p>
              </div>
            </div>
          </div>
        </div>
      </ToolModalShell>
      {canOpenBuilderFromTimeslot ? (
        <PracticeBuilderModal
          open={isBuilderOpen}
          onClose={() => {
            setIsBuilderOpen(false);
            // Refresh server data so the new practice appears in the calendar.
            router.refresh();
          }}
          programId={programId}
          teamId={teamId as string}
          seasonId={teamSeasonId as string}
          dateIso={builderDateIso}
          displayDate={builderDisplayDate}
          groups={[]}
          initialStartTimeIso={builderInitialStartTimeIso}
        />
      ) : null}
    </div>
  );
}