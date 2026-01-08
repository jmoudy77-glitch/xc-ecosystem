// app/programs/[programId]/(athletic)/recruiting/_components/RecruitingPrimarySurfaceInteractions.tsx

"use client";

import * as React from "react";
import type { RecruitingSlot, RecruitingAthleteSummary } from "./types";
import { DRAG_TYPES, type DragAthletePayload } from "./dragTypes";
import { parseRecruitingDnDPayload } from "@/app/lib/recruiting/parseRecruitingDnD";
import {
  hideSurfacedCandidate,
  removeFromFavorites,
  writeOriginRegistryEntry,
  type RecruitDiscoveryOriginRegistryEntry,
} from "@/app/lib/recruiting/portalStorage";

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
    const fallbackLabel = payload.athleteId ? `Athlete ${payload.athleteId.slice(0, 8)}` : "Athlete";
    writeOriginRegistryEntry(programId, {
      candidate: {
        id: payload.athleteId,
        displayName: payload.displayName?.trim() || fallbackLabel,
        eventGroup: payload.eventGroupKey ?? null,
        gradYear: payload.gradYear ?? null,
      },
      originKey: payload.originList,
      originMeta: { source: "slot-drop", recordedAt: new Date().toISOString() },
    });
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    // Debug trace for drop payloads
    try {
      const dt = e.dataTransfer;
      const types = Array.from(dt?.types ?? []);
      const rawAthlete = dt?.getData(DRAG_TYPES.ATHLETE) ?? "";
      const rawRecruit = dt?.getData("application/x-xcsys-recruiting") ?? "";
      const rawText = dt?.getData("text/plain") ?? "";
      console.info("[recruiting][drop] types=", types, {
        slot: { eventGroupKey: slot.eventGroupKey, slotId: slot.slotId },
        rawAthlete: rawAthlete ? rawAthlete.slice(0, 200) : "",
        rawRecruit: rawRecruit ? rawRecruit.slice(0, 200) : "",
        rawText: rawText ? rawText.slice(0, 200) : "",
      });
    } catch {
      // ignore
    }

    // 1) Existing M1 athlete drag payload (unchanged behavior)
    const rawAthlete = e.dataTransfer.getData(DRAG_TYPES.ATHLETE);
    if (rawAthlete) {
      try {
        const payload = JSON.parse(rawAthlete) as DragAthletePayload;
        if (normalizeEventGroupKey(payload.eventGroupKey) !== slot.eventGroupKey) {
          console.info("[recruiting][drop] eventGroup mismatch", {
            payload: payload.eventGroupKey,
            slot: slot.eventGroupKey,
          });
          return;
        }

        recordOrigin(payload);

        if (payload.originList === "favorites") {
          fetch("/api/recruiting/favorites/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              programId,
              sport: "xc",
              athleteId: payload.athleteId,
            }),
          })
            .then((res) => {
              if (!res.ok) throw new Error("favorites/delete failed");
              removeFromFavorites(programId, payload.athleteId);
              window.dispatchEvent(
                new CustomEvent("xc:recruiting:favorites:changed", { detail: { programId } })
              );
            })
            .catch(() => {
              // Keep local metadata intact on failure to avoid UI placeholder degradation.
            });
        } else if (payload.originList === "surfaced") {
          hideSurfacedCandidate(programId, payload.athleteId);
          window.dispatchEvent(
            new CustomEvent("xc:recruiting:surfaced:changed", { detail: { programId } })
          );
        }

        const athlete =
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
        // fall through to text/plain / custom payloads
      }
    }

    // 1b) Fallback: text/plain DragAthletePayload
    const rawText = e.dataTransfer.getData("text/plain");
    if (rawText) {
      try {
        const payload = JSON.parse(rawText) as Partial<DragAthletePayload>;
        if (payload?.athleteId && payload?.eventGroupKey) {
          if (normalizeEventGroupKey(payload.eventGroupKey) !== slot.eventGroupKey) {
            console.info("[recruiting][drop] eventGroup mismatch (text/plain)", {
              payload: payload.eventGroupKey,
              slot: slot.eventGroupKey,
            });
            return;
          }
          recordOrigin({
            athleteId: payload.athleteId,
            displayName: payload.displayName,
            eventGroupKey: payload.eventGroupKey,
            gradYear: payload.gradYear ?? null,
            originList: payload.originList,
          });
          if (payload.originList === "favorites") {
            fetch("/api/recruiting/favorites/delete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                programId,
                sport: "xc",
                athleteId: payload.athleteId,
              }),
            })
              .then((res) => {
                if (!res.ok) throw new Error("favorites/delete failed");
                removeFromFavorites(programId, payload.athleteId);
                window.dispatchEvent(
                  new CustomEvent("xc:recruiting:favorites:changed", { detail: { programId } })
                );
              })
              .catch(() => {
                // Keep local metadata intact on failure to avoid UI placeholder degradation.
              });
          } else if (payload.originList === "surfaced") {
            hideSurfacedCandidate(programId, payload.athleteId);
            window.dispatchEvent(
              new CustomEvent("xc:recruiting:surfaced:changed", { detail: { programId } })
            );
          }

          const athlete =
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

    // 2) Stabilization favorites/surfaced payload
    const payload = parseRecruitingDnDPayload(e);
    if (payload?.kind === "recruit_stabilization_candidate") {
      if (normalizeEventGroupKey(payload.eventGroup) !== slot.eventGroupKey) {
        console.info("[recruiting][drop] eventGroup mismatch (stabilization)", {
          payload: payload.eventGroup,
          slot: slot.eventGroupKey,
        });
        return;
      }
      recordOrigin({
        athleteId: payload.athleteId,
        displayName: payload.displayName,
        eventGroupKey: payload.eventGroup,
        gradYear: payload.gradYear ?? null,
        originList: payload.originKey,
      });
      if (payload.originKey === "favorites") {
        fetch("/api/recruiting/favorites/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            programId,
            sport: "xc",
            athleteId: payload.athleteId,
          }),
        })
          .then((res) => {
            if (!res.ok) throw new Error("favorites/delete failed");
            removeFromFavorites(programId, payload.athleteId);
            window.dispatchEvent(
              new CustomEvent("xc:recruiting:favorites:changed", { detail: { programId } })
            );
          })
          .catch(() => {
            // Keep local metadata intact on failure to avoid UI placeholder degradation.
          });
      } else if (payload.originKey === "surfaced") {
        hideSurfacedCandidate(programId, payload.athleteId);
        window.dispatchEvent(
          new CustomEvent("xc:recruiting:surfaced:changed", { detail: { programId } })
        );
      }
      onDropAthlete(payload.athleteId, {
        athleteId: payload.athleteId,
        displayName: payload.displayName,
        type: "recruit",
        originList: payload.originKey,
        eventGroupKey: payload.eventGroup,
        gradYear: payload.gradYear,
      });
      return;
    }

    // 3) Discovery Portal candidate payload (new)
    const discovery = payload;
    if (!discovery || discovery.kind !== "recruit_discovery_candidate") return;

    if (normalizeEventGroupKey(discovery.eventGroup) !== slot.eventGroupKey) {
      console.info("[recruiting][drop] eventGroup mismatch (discovery)", {
        payload: discovery.eventGroup,
        slot: slot.eventGroupKey,
      });
      return;
    }

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
      fetch("/api/recruiting/favorites/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId: discovery.programId,
          sport: "xc",
          athleteId: discovery.candidateId,
        }),
      }).catch(() => {
        // Best-effort delete; client cache already updated.
      });
      window.dispatchEvent(
        new CustomEvent("xc:recruiting:favorites:changed", { detail: { programId: discovery.programId } })
      );
    } else {
      hideSurfacedCandidate(discovery.programId, discovery.candidateId);
      window.dispatchEvent(
        new CustomEvent("xc:recruiting:surfaced:changed", { detail: { programId: discovery.programId } })
      );
    }

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
