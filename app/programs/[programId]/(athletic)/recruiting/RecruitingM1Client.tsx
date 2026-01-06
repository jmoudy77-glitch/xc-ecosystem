// app/programs/[programId]/(athletic)/recruiting/RecruitingM1Client.tsx

"use client";

import * as React from "react";
import { RecruitingPrimarySurfaceWired } from "./_components/RecruitingPrimarySurfaceWired";
import type { RecruitingEventGroupRow } from "./_components/types";
import { RecruitingSurfacedPanel } from "./RecruitingSurfacedPanel";
import { RecruitingFavoritesPanel } from "./RecruitingFavoritesPanel";
import { RecruitingSurfacedPanelClient } from "./RecruitingSurfacedPanelClient";
import { RecruitingFavoritesPanelClient } from "./RecruitingFavoritesPanelClient";

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
      {
        eventGroupKey: "sprint",
        label: "Sprints",
        slots: [makeEmptySlot("sprint", "S1")],
      },
    ],
    []
  );

  return (
    <div className="grid h-full min-h-0 grid-cols-12 gap-4">
      <div className="col-span-12 min-h-0 lg:col-span-3">
        <RecruitingSurfacedPanel>
          <RecruitingSurfacedPanelClient programId={programId} />
        </RecruitingSurfacedPanel>
      </div>

      <div className="col-span-12 min-h-0 lg:col-span-6">
        <RecruitingPrimarySurfaceWired programId={programId} initialRows={initialRows} />
      </div>

      <div className="col-span-12 min-h-0 lg:col-span-3">
        <RecruitingFavoritesPanel>
          <RecruitingFavoritesPanelClient programId={programId} />
        </RecruitingFavoritesPanel>
      </div>
    </div>
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
