"use client";

import * as React from "react";
import { RecruitingPrimarySurfaceWired } from "./_components/RecruitingPrimarySurfaceWired";
import type { RecruitingEventGroupRow } from "./_components/types";
import { RecruitingSurfacedPanel } from "./RecruitingSurfacedPanel";
import { RecruitingFavoritesPanel } from "./RecruitingFavoritesPanel";
import { RecruitingSurfacedPanelClient } from "./RecruitingSurfacedPanelClient";
import { RecruitingFavoritesPanelClient } from "./RecruitingFavoritesPanelClient";
import { useRecruitingM3UIPayload } from "./m3/useRecruitingM3UIPayload";
import { RecruitingM3UIProvider } from "./m3/RecruitingM3UIContext";

type Props = {
  programId: string;
  teamSeasonId: string | null;
};

export default function RecruitingM1Client({ programId, teamSeasonId }: Props) {
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

  const m3 = useRecruitingM3UIPayload(programId, "xc");

  return (
    <RecruitingM3UIProvider value={m3}>
      <div className="grid h-full min-h-0 grid-cols-12 gap-4">
        <div className="col-span-12 min-h-0 lg:col-span-3">
          <RecruitingSurfacedPanel>
            <RecruitingSurfacedPanelClient
              programId={programId}
              m3SummariesById={m3?.recruitSummariesById ?? null}
            />
          </RecruitingSurfacedPanel>
        </div>

        <div className="col-span-12 min-h-0 lg:col-span-6">
          {teamSeasonId ? (
            <RecruitingPrimarySurfaceWired
              programId={programId}
              teamSeasonId={teamSeasonId}
              initialRows={initialRows}
            />
          ) : (
            <div className="rounded-2xl border border-subtle bg-surface p-6 text-[12px] text-slate-100">
              Select a Team and Season from the program header to load roster slots.
            </div>
          )}
        </div>

        <div className="col-span-12 min-h-0 lg:col-span-3">
          <RecruitingFavoritesPanel>
            <RecruitingFavoritesPanelClient
              programId={programId}
              m3SummariesById={m3?.recruitSummariesById ?? null}
            />
          </RecruitingFavoritesPanel>
        </div>
      </div>
    </RecruitingM3UIProvider>
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
