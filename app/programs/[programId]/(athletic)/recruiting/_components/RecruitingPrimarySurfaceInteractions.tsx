// app/programs/[programId]/(athletic)/recruiting/_components/RecruitingPrimarySurfaceInteractions.tsx

"use client";

import * as React from "react";
import type { RecruitingSlot } from "./types";
import { DRAG_TYPES, type DragAthletePayload } from "./dragTypes";
import { parseRecruitingDnDPayload } from "@/app/lib/recruiting/parseRecruitingDnD";
import {
  hideSurfacedCandidate,
  removeFromFavorites,
  writeOriginRegistryEntry,
  type RecruitDiscoveryOriginRegistryEntry,
} from "@/app/lib/recruiting/portalStorage";

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
    if (!discovery || discovery.kind !== "recruit_discovery_candidate") return;

    if ((discovery.eventGroup ?? null) !== (slot.eventGroupKey ?? null)) return;

    const entry: RecruitDiscoveryOriginRegistryEntry = {
      candidate: {
        id: discovery.candidateId,
        displayName: discovery.displayName,
        eventGroup: discovery.eventGroup ?? null,
        gradYear: discovery.gradYear ?? null,
      },
      originKey: discovery.originKey,
      originMeta: discovery.originMeta ?? {},
    };

    // Record origin for later restoration on removal.
    writeOriginRegistryEntry(discovery.programId, entry);

    // While placed, suppress candidate in their origin list.
    if (discovery.originKey === "favorites") {
      removeFromFavorites(discovery.programId, discovery.candidateId);
    } else {
      hideSurfacedCandidate(discovery.programId, discovery.candidateId);
    }

    onDropAthlete(discovery.candidateId);
  };

  return (
    <div onDragOver={onDragOver} onDrop={onDrop}>
      {/* wrapper only; visual surface already rendered in skeleton */}
    </div>
  );
}
