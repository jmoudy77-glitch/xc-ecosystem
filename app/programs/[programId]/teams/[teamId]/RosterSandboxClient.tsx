// app/programs/[programId]/teams/[teamId]/RosterSandboxClient.tsx

"use client";

import * as React from "react";
import { RecruitingPrimarySurfaceSkeleton } from "@/app/programs/[programId]/teams/[teamId]/(administration)/roster-planning/_components/RecruitingPrimarySurfaceSkeleton";
import { DRAG_TYPES } from "@/app/programs/[programId]/(athletic)/recruiting/_components/dragTypes";
import type {
  RecruitingEventGroupRow,
  RecruitingSlot,
  RecruitingAthleteSummary,
} from "@/app/programs/[programId]/(athletic)/recruiting/_components/types";

type ExpandedKey = { eventGroupKey: string; slotId: string } | null;

type Assignment = {
  eventGroupKey: string;
  slotId: string;
  athleteId: string;
  athleteType: "returning" | "recruit";
  isPrimary: boolean;
  position: number;
  displayName: string;
  avatarUrl?: string | null;
  gradYear?: number | null;
};

type ReadPayload = {
  ok: boolean;
  teamSeasonId: string;
  programId: string;
  sport: "xc" | "tf";
  rosterLockDate: string | null;
  state: {
    isLocked: boolean;
    autoSyncOnOpen: boolean;
    lockedAt: string | null;
    lastSyncedAt: string | null;
    autoLockedThisRead: boolean;
  };
  assignments: Assignment[];
};

async function postJson<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || "Request failed");
  }
  return json.data as T;
}

function normalizeEventGroupKey(value: string | null | undefined) {
  if (!value) return null;
  const v = value.toLowerCase();
  if (v.includes("sprint")) return "sprint";
  if (v.includes("mid")) return "mid";
  if (v.includes("distance")) return "distance";
  return v.replace(/\s+/g, "");
}

function makeEmptySlot(eventGroupKey: string, slotId: string): RecruitingSlot {
  return {
    slotId,
    eventGroupKey,
    primaryAthleteId: null,
    athleteIds: [],
    athletesById: {},
  };
}

function buildRowsFromAssignments(
  baseRows: RecruitingEventGroupRow[],
  assignments: Assignment[]
): RecruitingEventGroupRow[] {
  return baseRows.map((row) => {
    const rowEventGroupKey = normalizeEventGroupKey(row.eventGroupKey);
    const nextSlots = row.slots.map((slot) => {
      const slotAssignments = assignments
        .filter(
          (a) =>
            normalizeEventGroupKey(a.eventGroupKey) === rowEventGroupKey &&
            a.slotId === slot.slotId
        )
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

      const athleteIds = slotAssignments.map((a) => a.athleteId);
      const primary = slotAssignments.find((a) => a.isPrimary)?.athleteId ?? null;
      const primaryAthleteId = primary ?? (athleteIds.length === 1 ? athleteIds[0] : null);

      const athletesById: Record<string, RecruitingAthleteSummary> = {};
      for (const a of slotAssignments) {
        athletesById[a.athleteId] = {
          athleteId: a.athleteId,
          displayName: a.displayName,
          avatarUrl: a.avatarUrl ?? null,
          type: a.athleteType,
          gradYear: a.gradYear ?? null,
          eventGroupKey: row.eventGroupKey,
        };
      }

      return {
        ...slot,
        athleteIds,
        primaryAthleteId,
        athletesById,
      };
    });

    return { ...row, slots: nextSlots };
  });
}

export default function RosterSandboxClient({
  programId,
  teamId: _teamId,
  teamSeasonId,
}: {
  programId: string;
  teamId: string;
  teamSeasonId: string | null;
}) {
  const [rows, setRows] = React.useState<RecruitingEventGroupRow[]>([]);
  const [expanded, setExpanded] = React.useState<ExpandedKey>(null);
  const [state, setState] = React.useState<ReadPayload["state"] | null>(null);
  const [rosterLockDate, setRosterLockDate] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  const baseRows = React.useMemo<RecruitingEventGroupRow[]>(
    () => [
      {
        eventGroupKey: "distance",
        label: "Distance",
        slots: [makeEmptySlot("distance", "D1"), makeEmptySlot("distance", "D2")],
      },
      {
        eventGroupKey: "mid",
        label: "Mid-Distance",
        slots: [makeEmptySlot("mid", "M1")],
      },
      {
        eventGroupKey: "sprint",
        label: "Sprints",
        slots: [makeEmptySlot("sprint", "S1")],
      },
    ],
    []
  );

  React.useEffect(() => {
    if (!teamSeasonId) return;
    setRows(baseRows);
  }, [baseRows, teamSeasonId]);

  const refresh = React.useCallback(async () => {
    if (!teamSeasonId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await postJson<ReadPayload>("/api/roster-planning/slots/read", { teamSeasonId });
      setState(data.state);
      setRosterLockDate(data.rosterLockDate);
      const assignments = Array.isArray(data.assignments) ? data.assignments : [];
      setRows(buildRowsFromAssignments(baseRows, assignments));
    } catch (e: any) {
      setError(e?.message || "Failed to load roster planning");
      setRows(baseRows);
    } finally {
      setLoading(false);
    }
  }, [baseRows, teamSeasonId]);

  React.useEffect(() => {
    if (!teamSeasonId) return;
    refresh();
  }, [teamSeasonId, refresh]);

  const onToggleExpand = (eventGroupKey: string, slotId: string) => {
    setExpanded((prev) =>
      prev?.eventGroupKey === eventGroupKey && prev?.slotId === slotId
        ? null
        : { eventGroupKey, slotId }
    );
  };

  const onOpenAthlete = (_athlete: RecruitingAthleteSummary) => {
    // Roster planning does not open modals here.
  };

  const onSetPrimary = (_eventGroupKey: string, _slotId: string, _athleteId: string) => {
    // Roster planning does not change recruiting primary.
  };

  const onRemoveAthlete = (
    _eventGroupKey: string,
    _slotId: string,
    _athleteId: string,
    _opts?: { returnToOrigin?: boolean }
  ) => {
    // Removing from slot is not part of roster planning scope.
  };

  const getDropHandlers = (_slot: RecruitingSlot) => {
    return {};
  };

  const getSlotHasPrimary = (eventGroupKey: string, slotId: string) => {
    const row = rows.find((r) => r.eventGroupKey === eventGroupKey);
    const slot = row?.slots.find((s) => s.slotId === slotId);
    return Boolean(slot?.primaryAthleteId);
  };

  const onToggleLock = async () => {
    if (!teamSeasonId || !state) return;
    setError(null);
    setLoading(true);

    try {
      if (state.isLocked) {
        const sync = window.confirm(
          "Unlock roster planning. Sync with Recruiting now? This overwrites membership and order."
        );
        await postJson("/api/roster-planning/state/set-lock", {
          teamSeasonId,
          isLocked: false,
          syncWithRecruiting: sync,
        });
      } else {
        await postJson("/api/roster-planning/state/set-lock", {
          teamSeasonId,
          isLocked: true,
          syncWithRecruiting: false,
        });
      }

      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to update lock state.");
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (!expanded) return;
    if (!teamSeasonId) return;
    if (!state || state.isLocked) return;

    const overlay = document.querySelector("[data-recruiting-expanded-overlay]") as HTMLElement | null;
    if (!overlay) return;

    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    };

    const onDrop = async (e: DragEvent) => {
      if (!e.dataTransfer) return;
      const raw = e.dataTransfer.getData(DRAG_TYPES.ATHLETE) || e.dataTransfer.getData("text/plain");
      if (!raw) return;

      let payload: any = null;
      try {
        payload = JSON.parse(raw);
      } catch {
        return;
      }

      const draggedAthleteId = payload?.athleteId as string | undefined;
      const draggedEventGroupKey = payload?.eventGroupKey as string | undefined;
      if (!draggedAthleteId) return;
      if (draggedEventGroupKey && draggedEventGroupKey !== expanded.eventGroupKey) return;

      const target = (e.target as HTMLElement | null)?.closest(
        "[data-roster-chip-athlete-id]"
      ) as HTMLElement | null;
      const beforeAthleteId = target?.getAttribute("data-roster-chip-athlete-id") || null;

      const row = rows.find((r) => r.eventGroupKey === expanded.eventGroupKey);
      const slot = row?.slots.find((s) => s.slotId === expanded.slotId);
      if (!slot) return;

      if (!slot.athleteIds.includes(draggedAthleteId)) return;
      if (beforeAthleteId && !slot.athleteIds.includes(beforeAthleteId)) return;

      try {
        await postJson("/api/roster-planning/slots/reorder", {
          teamSeasonId,
          eventGroupKey: expanded.eventGroupKey,
          slotId: expanded.slotId,
          athleteId: draggedAthleteId,
          beforeAthleteId: beforeAthleteId === draggedAthleteId ? null : beforeAthleteId,
        });
        await refresh();
      } catch {
        // Best-effort; refresh errors surface elsewhere.
      }
    };

    const row = rows.find((r) => r.eventGroupKey === expanded.eventGroupKey);
    const slot = row?.slots.find((s) => s.slotId === expanded.slotId);
    if (slot) {
      const chipButtons = Array.from(
        overlay.querySelectorAll("button[draggable='true']")
      ) as HTMLButtonElement[];
      chipButtons.forEach((btn, idx) => {
        const athleteId = slot.athleteIds[idx];
        const wrap = btn.closest("div.shrink-0") as HTMLElement | null;
        if (wrap && athleteId) wrap.setAttribute("data-roster-chip-athlete-id", athleteId);
      });
    }

    overlay.addEventListener("dragover", onDragOver);
    overlay.addEventListener("drop", onDrop);

    return () => {
      overlay.removeEventListener("dragover", onDragOver);
      overlay.removeEventListener("drop", onDrop);
    };
  }, [expanded, teamSeasonId, state, rows, refresh]);

  if (!teamSeasonId) {
    return (
      <div className="p-6 text-sm text-muted">
        Select a Team + Season in the top-right header to open Roster Planning.
      </div>
    );
  }

  const lockDate = rosterLockDate ? new Date(rosterLockDate) : null;
  const unlockDisabled = Boolean(state?.autoLockedThisRead || (lockDate && Date.now() >= lockDate.getTime()));
  const isLocked = Boolean(state?.isLocked);
  const lockLabel = isLocked ? "Locked" : "Unlocked";

  return (
    <div className="flex h-full w-full flex-col">
      <div className="mb-3 flex items-center justify-between gap-3 px-6 pt-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-100">Roster Planning</div>
        </div>

        <div className="flex items-center gap-2">
          {error ? <div className="text-xs text-red-400">{error}</div> : null}
          <div className="text-[11px] text-muted">{lockLabel}</div>
          <button
            type="button"
            disabled={loading || !!error || (isLocked && unlockDisabled)}
            onClick={onToggleLock}
            className={[
              "rounded-lg border border-subtle bg-surface px-3 py-1 text-xs font-semibold",
              "text-slate-100",
              loading || !!error || (isLocked && unlockDisabled)
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-surface/80",
            ].join(" ")}
            aria-label="Toggle roster planning lock"
            title={
              isLocked && unlockDisabled
                ? "Unlock disabled after roster lock date"
                : "Toggle locked/unlocked"
            }
          >
            {isLocked ? "Unlock" : "Lock"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mx-6 rounded-xl border border-subtle bg-surface p-3 text-[12px] text-slate-100">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mx-6 rounded-xl border border-subtle bg-surface p-6 text-[12px] text-muted">
          Loading...
        </div>
      ) : (
        <RecruitingPrimarySurfaceSkeleton
          programId={programId}
          rows={rows}
          expanded={expanded}
          onToggleExpand={onToggleExpand}
          onOpenAthlete={onOpenAthlete}
          onSetPrimary={onSetPrimary}
          onRemoveAthlete={onRemoveAthlete}
          getSlotHasPrimary={getSlotHasPrimary}
          getDropHandlers={getDropHandlers}
        />
      )}
    </div>
  );
}
