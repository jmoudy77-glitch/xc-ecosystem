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
};

export function DraggableAthleteChip({
  athlete,
  eventGroupKey,
  isPrimary,
  onOpen,
  onSetPrimary,
}: Props) {
  const onDragStart = (e: React.DragEvent) => {
    const payload: DragAthletePayload = {
      athleteId: athlete.athleteId,
      eventGroupKey,
    };
    e.dataTransfer.setData(DRAG_TYPES.ATHLETE, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
  };

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onSetPrimary();
  };

  const ring =
    athlete.type === "returning"
      ? "border-blue-500/35"
      : "border-yellow-400/35";

  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onClick={onOpen}
      onContextMenu={onContextMenu}
      className={[
        "w-full rounded-lg border px-3 py-2 text-left",
        ring,
        isPrimary ? "bg-slate-900/30" : "bg-surface hover:bg-slate-900/20",
      ].join(" ")}
      aria-label={isPrimary ? "Primary athlete" : "Secondary athlete"}
      title="Drag to another slot (primary surface). Right-click to set PRIMARY."
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[12px] font-semibold text-slate-100">
            {athlete.displayName}
            {isPrimary ? <span className="ml-2 text-[10px] text-slate-300">PRIMARY</span> : null}
          </div>
          <div className="mt-0.5 text-[11px] text-muted">
            {athlete.type === "returning" ? "Returning athlete" : "Recruit"}
          </div>
        </div>
        <div className="text-[10px] text-muted">{isPrimary ? "Presence renders" : "Secondary"}</div>
      </div>
    </button>
  );
}
