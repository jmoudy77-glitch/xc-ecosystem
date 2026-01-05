// app/programs/[programId]/(athletic)/recruiting/_components/RecruitingPrimarySurfaceInteractions.tsx

"use client";

import * as React from "react";
import type { RecruitingSlot } from "./types";
import { DRAG_TYPES, type DragAthletePayload } from "./dragTypes";
import { parseRecruitingDnDPayload } from "@/app/lib/recruiting/parseRecruitingDnD";

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

    // 1) Existing M1 athlete drag payload (unchanged behavior)
    const rawAthlete = e.dataTransfer.getData(DRAG_TYPES.ATHLETE);
    if (rawAthlete) {
      const payload = JSON.parse(rawAthlete) as DragAthletePayload;
      if (payload.eventGroupKey !== slot.eventGroupKey) return;

      onDropAthlete(payload.athleteId);
      return;
    }

    // 2) Discovery Portal candidate payload (new)
    const discovery = parseRecruitingDnDPayload(e);
    if (!discovery) return;

    if ((discovery.eventGroup ?? null) !== (slot.eventGroupKey ?? null)) return;

    // NOTE: M1 currently accepts only an athleteId string. We pass through the
    // candidateId. Origin propagation remains UI-level and will be wired in the
    // next promotion where the reducer accepts origin metadata.
    onDropAthlete(discovery.candidateId);
  };

  return (
    <div onDragOver={onDragOver} onDrop={onDrop}>
      {/* wrapper only; visual surface already rendered in skeleton */}
    </div>
  );
}
