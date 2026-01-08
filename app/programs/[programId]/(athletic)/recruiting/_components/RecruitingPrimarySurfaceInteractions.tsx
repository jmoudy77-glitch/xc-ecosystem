// app/programs/[programId]/(athletic)/recruiting/_components/RecruitingPrimarySurfaceInteractions.tsx

"use client";

import * as React from "react";
import type { RecruitingSlot, RecruitingAthleteSummary } from "./types";
import { DRAG_TYPES, type DragAthletePayload } from "./dragTypes";
import { parseRecruitingDnDPayload } from "@/app/lib/recruiting/parseRecruitingDnD";
import { writeOriginRegistryEntry } from "@/app/lib/recruiting/portalStorage";

type Props = {
  programId: string;
  slot: RecruitingSlot;
  onDropAthlete: (athleteId: string, athlete?: RecruitingAthleteSummary) => void;
};

export function getSlotDropHandlers({ programId, slot, onDropAthlete }: Props) {
  const normalizeEventGroupKey = (value: string | null | undefined) => {
    if (!value) return null;
    const v = value.toLowerCase();
    if (v.includes("sprint")) return "sprint";
    if (v.includes("mid")) return "mid";
    if (v.includes("distance")) return "distance";
    return v.replace(/\s+/g, "");
  };

  const recordOrigin = (payload: {
    athleteId: string;
    displayName?: string;
    eventGroupKey?: string | null;
    gradYear?: number | null;
    originList?: "favorites" | "surfaced";
  }) => {
    if (!payload.originList) return;

    writeOriginRegistryEntry(programId, {
      candidate: {
        id: payload.athleteId,
        displayName: payload.displayName?.trim() || `Athlete ${payload.athleteId.slice(0, 8)}`,
        eventGroup: payload.eventGroupKey ?? slot.eventGroupKey,
        gradYear: payload.gradYear ?? null,
      },
      originKey: payload.originList,
      originMeta: { recordedAt: new Date().toISOString() },
    });
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();

    // Prefer structured recruiting payloads when present (stable labels + origin)
    const structured = parseRecruitingDnDPayload(e);
    if (structured?.kind === "recruit_stabilization_candidate") {
      if (normalizeEventGroupKey(structured.eventGroup) !== slot.eventGroupKey) return;

      recordOrigin({
        athleteId: structured.athleteId,
        eventGroupKey: structured.eventGroup,
        displayName: structured.displayName,
        gradYear: structured.gradYear ?? null,
        originList: structured.originKey,
      });

      onDropAthlete(structured.athleteId, {
        athleteId: structured.athleteId,
        displayName: structured.displayName,
        type: "recruit",
        originList: structured.originKey,
        eventGroupKey: structured.eventGroup,
        gradYear: structured.gradYear,
      });
      return;
    }

    // Debug trace for drop payloads
    try {
      const dt = e.dataTransfer;
      const types = Array.from(dt?.types ?? []);
      const rawAthlete = dt?.getData(DRAG_TYPES.ATHLETE) ?? "";
      const rawRecruit = dt?.getData("application/x-xcsys-recruiting") ?? "";
      const rawText = dt?.getData("text/plain") ?? "";
      console.info("[recruiting][drop] types=", types, {
        slot: { eventGroupKey: slot.eventGroupKey, slotId: slot.slotId },
        rawAthlete,
        rawRecruit,
        rawText,
      });
    } catch {
      // ignore
    }

    // 1) Primary surface payload (DRAG_TYPES.ATHLETE)
    const rawAthlete = e.dataTransfer.getData(DRAG_TYPES.ATHLETE);
    if (rawAthlete) {
      try {
        const payload = JSON.parse(rawAthlete) as DragAthletePayload;

        if (normalizeEventGroupKey(payload.eventGroupKey) !== slot.eventGroupKey) return;

        recordOrigin(payload);

        const athlete: RecruitingAthleteSummary | undefined =
          payload.displayName
            ? {
                athleteId: payload.athleteId,
                displayName: payload.displayName,
                type: "recruit",
                originList: payload.originList ?? undefined,
                eventGroupKey: payload.eventGroupKey,
                gradYear: payload.gradYear ?? null,
              }
            : undefined;

        onDropAthlete(payload.athleteId, athlete);
        return;
      } catch {
        // fall through
      }
    }

    // 1b) Fallback: text/plain DragAthletePayload
    const rawText = e.dataTransfer.getData("text/plain");
    if (rawText) {
      try {
        const payload = JSON.parse(rawText) as Partial<DragAthletePayload>;
        if (payload?.athleteId && payload?.eventGroupKey) {
          if (normalizeEventGroupKey(payload.eventGroupKey) !== slot.eventGroupKey) return;

          recordOrigin({
            athleteId: payload.athleteId,
            displayName: payload.displayName,
            eventGroupKey: payload.eventGroupKey,
            gradYear: payload.gradYear ?? null,
            originList: payload.originList,
          });

          const athlete: RecruitingAthleteSummary | undefined =
            payload.displayName
              ? {
                  athleteId: payload.athleteId,
                  displayName: payload.displayName,
                  type: "recruit",
                  originList: payload.originList ?? undefined,
                  eventGroupKey: payload.eventGroupKey,
                  gradYear: payload.gradYear ?? null,
                }
              : undefined;

          onDropAthlete(payload.athleteId, athlete);
          return;
        }
      } catch {
        // ignore
      }
    }

    // 2) Discovery payloads (for completeness)
    const discovery = structured?.kind === "recruit_discovery_candidate" ? structured : null;
    if (!discovery) return;

    if (normalizeEventGroupKey(discovery.eventGroup) !== slot.eventGroupKey) return;

    writeOriginRegistryEntry(programId, {
      candidate: {
        id: discovery.candidateId,
        displayName: discovery.displayName,
        eventGroup: discovery.eventGroup ?? null,
        gradYear: discovery.gradYear ?? null,
      },
      originKey: discovery.originKey,
      originMeta: discovery.originMeta ?? {},
    });

    onDropAthlete(discovery.candidateId, {
      athleteId: discovery.candidateId,
      displayName: discovery.displayName,
      type: "recruit",
      originList: discovery.originKey,
      eventGroupKey: discovery.eventGroup ?? null,
      gradYear: discovery.gradYear ?? null,
    });
  };

  return { onDragOver, onDrop };
}

export function SlotDropZone({ programId, slot, onDropAthlete }: Props) {
  const { onDragOver, onDrop } = getSlotDropHandlers({ programId, slot, onDropAthlete });
  return (
    <div
      className="h-full w-full"
      onDragOver={onDragOver}
      onDrop={onDrop}
      aria-label={`Drop zone for ${slot.slotId}`}
    />
  );
}
