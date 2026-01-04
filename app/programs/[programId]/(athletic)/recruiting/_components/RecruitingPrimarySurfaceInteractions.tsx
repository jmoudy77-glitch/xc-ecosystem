// app/programs/[programId]/(athletic)/recruiting/_components/RecruitingPrimarySurfaceInteractions.tsx

"use client";

import * as React from "react";
import type { RecruitingSlot } from "./types";
import { DRAG_TYPES, type DragAthletePayload } from "./dragTypes";

type Props = {
  slot: RecruitingSlot;
  onDropAthlete: (athleteId: string) => void;
};

export function SlotDropZone({ slot, onDropAthlete }: Props) {
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData(DRAG_TYPES.ATHLETE);
    if (!raw) return;

    const payload = JSON.parse(raw) as DragAthletePayload;
    if (payload.eventGroupKey !== slot.eventGroupKey) return;

    onDropAthlete(payload.athleteId);
  };

  return (
    <div onDragOver={onDragOver} onDrop={onDrop}>
      {/* wrapper only; visual surface already rendered in skeleton */}
    </div>
  );
}
