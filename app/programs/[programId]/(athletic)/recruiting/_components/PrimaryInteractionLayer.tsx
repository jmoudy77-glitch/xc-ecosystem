// app/programs/[programId]/(athletic)/recruiting/_components/PrimaryInteractionLayer.tsx

"use client";

import * as React from "react";
import type { RecruitingSlot } from "./types";

type Props = {
  slot: RecruitingSlot;
  onSetPrimary: (athleteId: string) => void;
};

export function PrimaryInteractionLayer({ slot, onSetPrimary }: Props) {
  const onContextMenu = (e: React.MouseEvent, athleteId: string) => {
    e.preventDefault();
    onSetPrimary(athleteId);
  };

  // Placeholder: selection-state UI will be implemented later
  const requiresSelection =
    slot.primaryAthleteId === null && slot.athleteIds.length >= 2;

  return (
    <>
      {slot.athleteIds.map((athleteId) => (
        <div
          key={athleteId}
          onContextMenu={(e) => onContextMenu(e, athleteId)}
        />
      ))}

      {requiresSelection ? (
        <div className="mt-2 rounded-md border border-dashed border-yellow-400/40 bg-yellow-400/5 px-2 py-1 text-[10px] text-yellow-200">
          PRIMARY required — select one athlete
        </div>
      ) : null}
    </>
  );
}
