// app/programs/[programId]/(athletic)/recruiting/_components/SlotRemoveDropZone.tsx

"use client";

import * as React from "react";
import { DRAG_TYPES, type DragAthletePayload } from "./dragTypes";
import type { RecruitingSlot } from "./types";

type Props = {
  slot: RecruitingSlot;
  onRemoveAthlete: (athleteId: string) => void;
  disabled?: boolean;
  disabledReason?: string;
};

export function SlotRemoveDropZone({
  slot,
  onRemoveAthlete,
  disabled,
  disabledReason,
}: Props) {
  const [isOver, setIsOver] = React.useState(false);

  const onDragOver = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDragEnter = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsOver(true);
  };

  const onDragLeave = () => {
    setIsOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsOver(false);

    const raw = e.dataTransfer.getData(DRAG_TYPES.ATHLETE);
    if (!raw) return;

    const payload = JSON.parse(raw) as DragAthletePayload;

    // Only allow removal if the athlete is in this slot.
    if (!slot.athleteIds.includes(payload.athleteId)) return;

    onRemoveAthlete(payload.athleteId);
  };

  return (
    <div
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={[
        "mt-3 rounded-lg border border-dashed px-3 py-2 text-[11px]",
        disabled
          ? "border-subtle bg-slate-900/10 text-muted opacity-70"
          : isOver
            ? "border-red-400/50 bg-red-500/10 text-red-200"
            : "border-subtle bg-slate-900/20 text-muted",
      ].join(" ")}
      aria-label="Remove athlete drop zone"
      title={
        disabled
          ? disabledReason ?? "Removal disabled"
          : "Drag an athlete chip here to remove them from this slot."
      }
    >
      {disabled ? (disabledReason ?? "Removal disabled") : "Drag here to remove from slot"}
    </div>
  );
}
