// app/programs/[programId]/(athletic)/recruiting/RecruitingM1Client.tsx

"use client";

import * as React from "react";
import { RecruitingPrimarySurfaceWired } from "./_components/RecruitingPrimarySurfaceWired";
import type { RecruitingEventGroupRow } from "./_components/types";

type Props = {
  programId: string;
};

export default function RecruitingM1Client({ programId }: Props) {
  const initialRows = React.useMemo<RecruitingEventGroupRow[]>(
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
    ],
    []
  );

  return (
    <RecruitingPrimarySurfaceWired
      programId={programId}
      initialRows={initialRows}
    />
  );
}

function makeEmptySlot(eventGroupKey: string, slotId: string) {
  return {
    slotId,
    eventGroupKey,
    primaryAthleteId: null,
    athleteIds: [],
    athletesById: {},
  };
}
