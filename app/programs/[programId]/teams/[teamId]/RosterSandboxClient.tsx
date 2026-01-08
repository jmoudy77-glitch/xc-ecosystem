// app/programs/[programId]/teams/[teamId]/RosterSandboxClient.tsx

"use client";

import * as React from "react";
import { RecruitingPrimarySurfaceSkeleton } from "./(administration)/roster-planning/_components/RecruitingPrimarySurfaceSkeleton";
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

function groupToRows(assignments: Assignment[]): RecruitingEventGroupRow[] {
  const byEventGroup = new Map<string, Map<string, Assignment[]>>();

  for (const a of assignments) {
    if (!byEventGroup.has(a.eventGroupKey)) byEventGroup.set(a.eventGroupKey, new Map());
    const bySlot = byEventGroup.get(a.eventGroupKey)!;
    if (!bySlot.has(a.slotId)) bySlot.set(a.slotId, []);
    bySlot.get(a.slotId)!.push(a);
  }

  const rows: RecruitingEventGroupRow[] = [];
  for (const [eventGroupKey, bySlot] of byEventGroup.entries()) {
    const slots: RecruitingSlot[] = [];
    for (const [slotId, list] of bySlot.entries()) {
      const sorted = [...list].sort((x, y) => (x.position ?? 0) - (y.position ?? 0));
      const athletesById: Record<string, RecruitingAthleteSummary> = {};
      for (const x of sorted) {
        athletesById[x.athleteId] = {
          athleteId: x.athleteId,
          displayName: x.displayName,
          avatarUrl: x.avatarUrl ?? null,
          type: x.athleteType,
          gradYear: x.gradYear ?? null,
          eventGroupKey,
        };
      }
      const athleteIds = sorted.map((x) => x.athleteId);
      const primary = sorted.find((x) => x.isPrimary)?.athleteId ?? null;

      slots.push({
        slotId,
        eventGroupKey,
        primaryAthleteId: primary ?? (athleteIds.length > 0 ? athleteIds[0] : null),
        athleteIds,
        athletesById,
      });
    }

    rows.push({
      eventGroupKey,
      label: eventGroupKey,
      slots: slots.sort((a, b) => a.slotId.localeCompare(b.slotId)),
    });
  }

  return rows.sort((a, b) => a.eventGroupKey.localeCompare(b.eventGroupKey));
}

export default function RosterSandboxClient({
  programId,
  teamId,
}: {
  programId: string;
  teamId: string;
}) {
  const [teamSeasonId, setTeamSeasonId] = React.useState<string | null>(null);
  const [state, setState] = React.useState<ReadPayload["state"] | null>(null);
  const [sport, setSport] = React.useState<"xc" | "tf" | null>(null);
  const [rosterLockDate, setRosterLockDate] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<RecruitingEventGroupRow[]>([]);
  const [expanded, setExpanded] = React.useState<ExpandedKey>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  const refresh = React.useCallback(async () => {
    if (!teamSeasonId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await postJson<ReadPayload>("/api/roster-planning/slots/read", { teamSeasonId });
      setState(data.state);
      setSport(data.sport);
      setRosterLockDate(data.rosterLockDate);
      setRows(groupToRows(data.assignments || []));
    } catch (e: any) {
      setError(e?.message || "Failed to load roster planning");
    } finally {
      setLoading(false);
    }
  }, [teamSeasonId]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await postJson<{
          teamSeasonId: string;
          rosterLockDate: string | null;
          isTeamSeasonLocked: boolean | null;
          sport: "xc" | "tf" | null;
        }>(
          "/api/programs/" + programId + "/teams/" + teamId + "/team-season/current",
          {
            programId,
            teamId,
          }
        );

        if (!mounted) return;
        setTeamSeasonId(data.teamSeasonId);
        setSport((data.sport ?? "xc") as any);
        setRosterLockDate(data.rosterLockDate ?? null);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load team season");
        setLoading(false);
        return;
      }

      if (!mounted) return;
    })();
    return () => {
      mounted = false;
    };
  }, [programId, teamId]);

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

  const setLockState = async (isLocked: boolean, syncWithRecruiting: boolean) => {
    if (!teamSeasonId) return;
    await postJson("/api/roster-planning/state/set-lock", {
      teamSeasonId,
      isLocked,
      syncWithRecruiting,
    });
    await refresh();
  };

  const onToggleLock = async () => {
    if (!state) return;

    if (state.isLocked) {
      const sync = window.confirm(
        "Unlock roster planning. Sync with Recruiting now? This overwrites membership and order."
      );
      await setLockState(false, sync);
      return;
    }

    await setLockState(true, false);
  };

  const onOpenAthlete = (_a: RecruitingAthleteSummary) => {
    // Roster Planning surface does not open modals (per scope). No-op.
  };

  const onSetPrimary = (_eventGroupKey: string, _slotId: string, _athleteId: string) => {
    // Primary setting is a Recruiting behavior; Roster Planning does not change Recruiting. No-op.
  };

  const onRemoveAthlete = (_eventGroupKey: string, _slotId: string, _athleteId: string) => {
    // Removing is not part of this Roster Planning surface scope. No-op.
  };

  const getDropHandlers = (_slot: RecruitingSlot) => {
    return {};
  };

  const getSlotHasPrimary = (eventGroupKey: string, slotId: string) => {
    const row = rows.find((r) => r.eventGroupKey === eventGroupKey);
    const slot = row?.slots.find((s) => s.slotId === slotId);
    return Boolean(slot?.primaryAthleteId);
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

  const isLocked = Boolean(state?.isLocked);
  const lockLabel = isLocked ? "Locked" : "Unlocked";
  const lockDate = rosterLockDate ? new Date(rosterLockDate) : null;
  const unlockDisabled = Boolean(lockDate && Date.now() >= lockDate.getTime());

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-100">Roster Planning</div>
          <div className="text-[11px] text-muted truncate">
            {teamSeasonId ? `Team Season: ${teamSeasonId}` : "Team Season: —"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-[11px] text-muted">{lockLabel}</div>
          <button
            type="button"
            disabled={loading || !!error || (!isLocked && unlockDisabled)}
            onClick={onToggleLock}
            className={[
              "rounded-lg border border-subtle bg-surface px-3 py-1 text-xs font-semibold",
              "text-slate-100",
              loading || !!error || (!isLocked && unlockDisabled)
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-surface/80",
            ].join(" ")}
            aria-label="Toggle roster planning lock"
            title={
              unlockDisabled
                ? "Unlock disabled after roster lock date"
                : "Toggle locked/unlocked"
            }
          >
            {isLocked ? "Unlock" : "Lock"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-subtle bg-surface p-3 text-[12px] text-slate-100">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-subtle bg-surface p-6 text-[12px] text-muted">
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
