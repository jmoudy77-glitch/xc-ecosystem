"use client";

import * as React from "react";
import { DRAG_TYPES } from "./_components/dragTypes";
import { M3ImpactGlyph, type M3RecruitImpactSummary } from "./m3/M3ImpactGlyph";

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

  // ADDITIVE: M3 UI consumption (inactive-safe)
  m3Summary?: M3RecruitImpactSummary | null;
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
  m3Summary,
}: Props) {
  return (
    <div
      className="relative flex items-center justify-between gap-2 rounded-xl ring-1 ring-panel panel-muted px-3 py-2"
      draggable
      onDragStart={(e) => {
        const payload = {
          athleteId: candidate.athleteId,
          eventGroupKey: candidate.eventGroup ?? "",
          displayName: candidate.displayName,
          gradYear: candidate.gradYear ?? null,
          originList: candidate.originKey,
        };
        e.dataTransfer.setData(DRAG_TYPES.ATHLETE, JSON.stringify(payload));
        e.dataTransfer.setData("text/plain", JSON.stringify(payload));
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData(
          "application/x-xcsys-recruiting",
          JSON.stringify(toDnDPayload(programId, candidate))
        );
      }}
      title="Drag into a slot"
    >
      {/* M3 Impact Glyph (read-only; renders null when absent) */}
      <div className="absolute right-2 top-2">
        <M3ImpactGlyph summary={m3Summary ?? null} />
      </div>

      <div className="min-w-0 pr-5">
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
