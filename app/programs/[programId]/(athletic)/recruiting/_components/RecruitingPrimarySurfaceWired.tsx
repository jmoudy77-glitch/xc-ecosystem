// app/programs/[programId]/(athletic)/recruiting/_components/RecruitingPrimarySurfaceWired.tsx

"use client";

import * as React from "react";
import { RecruitingPrimarySurfaceSkeleton } from "./RecruitingPrimarySurfaceSkeleton";
import { SlotDropZone } from "./RecruitingPrimarySurfaceInteractions";
import { PrimaryInteractionLayer } from "./PrimaryInteractionLayer";
import { useRecruitingSlots } from "./useRecruitingSlots";
import type { RecruitingEventGroupRow, RecruitingSlot } from "./types";

type Props = {
  programId: string;
  initialRows: RecruitingEventGroupRow[];
};

export function RecruitingPrimarySurfaceWired({ programId, initialRows }: Props) {
  const { rows, dispatch } = useRecruitingSlots(initialRows);

  return (
    <div>
      <RecruitingPrimarySurfaceSkeleton
        programId={programId}
        rows={rows.map(row => ({
          ...row,
          slots: row.slots.map(slot => ({
            ...slot,
            __primaryLayer: (
              <PrimaryInteractionLayer
                slot={slot}
                onSetPrimary={(athleteId) =>
                  dispatch({
                    type: "SET_PRIMARY",
                    eventGroupKey: row.eventGroupKey,
                    slotId: slot.slotId,
                    athleteId,
                  })
                }
              />
            ),
            __dropZone: (
              <SlotDropZone
                slot={slot}
                onDropAthlete={(athleteId) =>
                  dispatch({
                    type: "DROP_IN_SLOT",
                    eventGroupKey: row.eventGroupKey,
                    slotId: slot.slotId,
                    athleteId,
                  })
                }
              />
            ),
          })) as RecruitingSlot[],
        }))}
      />
    </div>
  );
}
