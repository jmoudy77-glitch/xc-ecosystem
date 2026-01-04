// app/programs/[programId]/recruiting/RecruitingM1Client.tsx

"use client";

import * as React from "react";
import { RecruitingPrimarySurfaceSkeleton } from "./_components/RecruitingPrimarySurfaceSkeleton";
import type { RecruitingEventGroupRow } from "./_components/types";

type Props = {
  programId: string;
};

export default function RecruitingM1Client({ programId }: Props) {
  const rows = React.useMemo<RecruitingEventGroupRow[]>(
    () => [
      {
        eventGroupKey: "distance",
        label: "Distance",
        slots: [
          makeEmptySlot("distance", "D1"),
          makeEmptySlot("distance", "D2"),
        ],
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

  return <RecruitingPrimarySurfaceSkeleton programId={programId} rows={rows} />;
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
