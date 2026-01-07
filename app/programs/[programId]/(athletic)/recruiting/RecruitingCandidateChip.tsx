// app/programs/[programId]/(athletic)/recruiting/RecruitingCandidateChip.tsx

"use client";

import * as React from "react";

type RecruitingPanelCandidate = {
  athleteId: string;
  displayName: string;
  eventGroup: string | null;
  gradYear: number | null;
  originKey: "surfaced" | "favorites";
  originMeta: Record<string, unknown>;
};

type Props = {
  programId: string;
  candidate: RecruitingPanelCandidate;
  onFavorite?: () => void;
  onRemoveFavorite?: () => void;
};

function toDnDPayload(programId: string, c: RecruitingPanelCandidate) {
  return {
    kind: "recruit_stabilization_candidate",
    programId,
    athleteId: c.athleteId,
    displayName: c.displayName,
    eventGroup: c.eventGroup,
    gradYear: c.gradYear,
    originKey: c.originKey,
    originMeta: c.originMeta ?? {},
  };
}

export function RecruitingCandidateChip({
  programId,
  candidate,
  onFavorite,
  onRemoveFavorite,
}: Props) {
  return (
    <div
      className="flex items-center justify-between gap-2 rounded-xl ring-1 ring-panel panel-muted px-3 py-2"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(
          "application/x-xcsys-recruiting",
          JSON.stringify(toDnDPayload(programId, candidate))
        );
      }}
      title="Drag into a slot"
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{candidate.displayName}</div>
        <div className="text-[11px] text-muted truncate">
          {candidate.eventGroup ?? "—"} · {candidate.gradYear ?? "—"}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {candidate.originKey === "surfaced" && onFavorite ? (
          <button
            type="button"
            className="glass-pill rounded-full px-2.5 py-1 text-[11px] ring-1 ring-panel hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
            onClick={onFavorite}
            title="Add to Favorites"
          >
            Favorite
          </button>
        ) : null}
        {candidate.originKey === "favorites" && onRemoveFavorite ? (
          <button
            type="button"
            className="glass-pill rounded-full px-2.5 py-1 text-[11px] ring-1 ring-panel hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
            onClick={onRemoveFavorite}
            title="Remove from Favorites"
          >
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}

export type { RecruitingPanelCandidate };
