// app/programs/[programId]/(athletic)/recruiting/_components/DraggableAthleteChip.tsx

"use client";

import * as React from "react";
import type { RecruitingAthleteSummary } from "./types";
import { DRAG_TYPES, type DragAthletePayload } from "./dragTypes";

type Props = {
  athlete: RecruitingAthleteSummary;
  eventGroupKey: string;
  isPrimary: boolean;
  onOpen: () => void;
  onSetPrimary: () => void;
  onRemove?: () => void;
};

export function DraggableAthleteChip({
  athlete,
  eventGroupKey,
  isPrimary,
  onOpen,
  onSetPrimary,
  onRemove,
}: Props) {
  const onDragStart = (e: React.DragEvent) => {
    const payload: DragAthletePayload = {
      athleteId: athlete.athleteId,
      eventGroupKey,
    };
    e.dataTransfer.setData(DRAG_TYPES.ATHLETE, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragEnd = (e: React.DragEvent) => {
    if (!onRemove) return;
    if (e.dataTransfer?.dropEffect && e.dataTransfer.dropEffect !== "none") return;
    onRemove();
  };

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onSetPrimary();
  };

  const ring =
    athlete.type === "returning"
      ? "ring-blue-500/80"
      : "ring-green-500/80";

  const meterPct = isPrimary ? 60 : 0;
  const summary = `${eventGroupKey} · ${athlete.type === "returning" ? "Returning" : "Recruit"}`;

  return (
    <div className="flex w-full flex-col items-center justify-center py-2">
      <div className="mb-2 h-1.5 w-16 overflow-hidden rounded-full bg-slate-900/40">
        <div className="h-full bg-slate-100/70" style={{ width: `${meterPct}%` }} />
      </div>

      <button
        type="button"
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onClick={onOpen}
        onContextMenu={onContextMenu}
        className={[
          "h-12 w-12 rounded-full bg-slate-800 ring-2 ring-offset-2 ring-offset-slate-950/60",
          ring,
        ].join(" ")}
        aria-label={athlete.displayName}
        title="Drag to another slot (primary surface). Right-click to set PRIMARY."
      />

      <div className="mt-2 text-center">
        <div className="max-w-[9rem] truncate text-[12px] font-semibold text-slate-100">
          {athlete.displayName}
        </div>
        <div className="mt-0.5 max-w-[9rem] truncate text-[11px] text-muted">
          {summary}
        </div>
      </div>
    </div>
  );
}
