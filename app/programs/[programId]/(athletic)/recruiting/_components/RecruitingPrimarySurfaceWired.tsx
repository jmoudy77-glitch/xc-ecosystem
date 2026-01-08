// app/programs/[programId]/(athletic)/recruiting/_components/RecruitingPrimarySurfaceWired.tsx

"use client";

import * as React from "react";
import { RecruitingPrimarySurfaceSkeleton } from "./RecruitingPrimarySurfaceSkeleton";
import { SlotDropZone } from "./RecruitingPrimarySurfaceInteractions";
import { AthleteFactsModal } from "./AthleteFactsModal";
import { useRecruitingSlots } from "./useRecruitingSlots";
import type { RecruitingEventGroupRow, RecruitingSlot, RecruitingAthleteSummary } from "./types";
import {
  addToFavoritesIfMissing,
  readFavorites,
  readOriginRegistryEntry,
  unhideSurfacedCandidate,
} from "@/app/lib/recruiting/portalStorage";
import { useRecruitingSlotPresence } from "../_hooks/useRecruitingSlotPresence";

type ExpandedKey = { eventGroupKey: string; slotId: string } | null;

type Props = {
  programId: string;
  initialRows: RecruitingEventGroupRow[];
};

type SlotAssignment = {
  event_group_key: string;
  slot_id: string;
  athlete_id: string;
  athlete_type: "returning" | "recruit";
  is_primary: boolean;
};

export function RecruitingPrimarySurfaceWired({ programId, initialRows }: Props) {
  const { rows, dispatch } = useRecruitingSlots(initialRows, {
    onRecruitReturn: (ev) => {
      const origin = readOriginRegistryEntry(programId, ev.athleteId);

      if (ev.originList === "favorites") {
        const displayName =
          origin?.candidate?.displayName ?? (ev.athleteId ? `Athlete ${ev.athleteId.slice(0, 8)}` : "Athlete");
        addToFavoritesIfMissing(programId, {
          id: ev.athleteId,
          displayName,
          eventGroup: origin?.candidate?.eventGroup ?? null,
          gradYear: origin?.candidate?.gradYear ?? null,
        });
        window.dispatchEvent(
          new CustomEvent("xc:recruiting:favorites:changed", { detail: { programId } })
        );
        return;
      }

      unhideSurfacedCandidate(programId, ev.athleteId);
      window.dispatchEvent(
        new CustomEvent("xc:recruiting:surfaced:changed", { detail: { programId } })
      );
    },
  });

  const [expanded, setExpanded] = React.useState<ExpandedKey>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalAthlete, setModalAthlete] = React.useState<RecruitingAthleteSummary | null>(null);
  const presence = useRecruitingSlotPresence({ programId, sport: "xc" });

  const buildRowsFromAssignments = React.useCallback(
    (assignments: SlotAssignment[]) => {
      const favorites = readFavorites(programId);
      const favoritesById = new Map<string, any>(
        favorites
          .map((c: any) => {
            const id = String(c?.id ?? c?.athleteId ?? c?.athlete_id ?? "").trim();
            return id ? [id, c] : null;
          })
          .filter(Boolean) as Array<[string, any]>
      );

      const resolveAthlete = (id: string, type: SlotAssignment["athlete_type"]): RecruitingAthleteSummary => {
        const fav = favoritesById.get(id);
        const origin = readOriginRegistryEntry(programId, id);
        const displayName = String(
          fav?.displayName ?? fav?.display_name ?? origin?.candidate?.displayName ?? ""
        ).trim();
        const fallbackLabel = id ? `Athlete ${id.slice(0, 8)}` : "Athlete";

        return {
          athleteId: id,
          displayName: displayName || fallbackLabel,
          type,
          originList: origin?.originKey ?? (fav ? "favorites" : undefined),
        };
      };

      return initialRows.map((row) => {
        const nextSlots = row.slots.map((slot) => {
          const slotAssignments = assignments.filter(
            (a) => a.event_group_key === row.eventGroupKey && a.slot_id === slot.slotId
          );

          const athleteIds = slotAssignments.map((a) => a.athlete_id);
          const primary = slotAssignments.find((a) => a.is_primary)?.athlete_id ?? null;
          const primaryAthleteId = primary ?? (athleteIds.length === 1 ? athleteIds[0] : null);

          const athletesById: Record<string, RecruitingAthleteSummary> = {};
          for (const a of slotAssignments) {
            athletesById[a.athlete_id] = resolveAthlete(a.athlete_id, a.athlete_type);
          }

          return {
            ...slot,
            athleteIds,
            primaryAthleteId,
            athletesById,
          };
        });

        return { ...row, slots: nextSlots };
      });
    },
    [initialRows, programId]
  );

  const loadSlotAssignments = React.useCallback(async () => {
    try {
      const res = await fetch("/api/recruiting/slots/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId, sport: "xc" }),
      });
      if (!res.ok) return;
      const json = await res.json();
      if (!json?.ok || !Array.isArray(json.data)) return;
      const nextRows = buildRowsFromAssignments(json.data as SlotAssignment[]);
      dispatch({ type: "HYDRATE_ROWS", rows: nextRows });
    } catch {
      // Best-effort; UI can operate locally if read fails.
    }
  }, [buildRowsFromAssignments, dispatch, programId]);

  React.useEffect(() => {
    loadSlotAssignments();
  }, [loadSlotAssignments]);

  const onToggleExpand = React.useCallback((eventGroupKey: string, slotId: string) => {
    setExpanded((prev) => {
      if (prev?.eventGroupKey === eventGroupKey && prev.slotId === slotId) return null;
      return { eventGroupKey, slotId };
    });
  }, []);

  const onOpenAthlete = React.useCallback((athlete: RecruitingAthleteSummary) => {
    setModalAthlete(athlete);
    setModalOpen(true);
  }, []);

  const onCloseModal = React.useCallback(() => {
    setModalOpen(false);
    setModalAthlete(null);
  }, []);

  const persistPrimary = React.useCallback(
    async (eventGroupKey: string, slotId: string, athleteId: string) => {
      const slot = rows.find((r) => r.eventGroupKey === eventGroupKey)?.slots.find((s) => s.slotId === slotId);
      const athlete = slot?.athletesById[athleteId];
      if (!athlete) return;

      try {
        await fetch("/api/recruiting/primary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            programId,
            sport: "xc",
            eventGroupKey,
            slotId,
            primaryAthleteId: athleteId,
            athleteType: athlete.type,
          }),
        });
        await loadSlotAssignments();
      } catch {
        // Best-effort persistence; UI remains authoritative.
      }
    },
    [rows, programId, loadSlotAssignments]
  );

  const onSetPrimary = React.useCallback(
    async (eventGroupKey: string, slotId: string, athleteId: string) => {
      dispatch({ type: "SET_PRIMARY", eventGroupKey, slotId, athleteId });
      await persistPrimary(eventGroupKey, slotId, athleteId);
    },
    [dispatch, persistPrimary]
  );

  const onRemoveAthlete = React.useCallback(
    async (eventGroupKey: string, slotId: string, athleteId: string) => {
      const slot = rows.find((r) => r.eventGroupKey === eventGroupKey)?.slots.find((s) => s.slotId === slotId);
      const athlete = slot?.athletesById[athleteId];

      if (athlete?.type === "returning") {
        return;
      }

      dispatch({ type: "REMOVE_ATHLETE", eventGroupKey, slotId, athleteId });

      if (athlete?.type === "recruit") {
        try {
          await fetch("/api/recruiting/slots/remove", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              programId,
              sport: "xc",
              eventGroupKey,
              slotId,
              athleteId,
            }),
          });
          await fetch("/api/recruiting/favorites/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ programId, sport: "xc", athleteId }),
          });
          await loadSlotAssignments();
        } catch {
          // Best-effort delete only.
        }
      }
    },
    [dispatch, loadSlotAssignments, programId, rows]
  );

  const onDropIntoSlot = React.useCallback(
    async (slot: RecruitingSlot, athleteId: string, athlete?: RecruitingAthleteSummary) => {
      dispatch({
        type: "DROP_IN_SLOT",
        eventGroupKey: slot.eventGroupKey,
        slotId: slot.slotId,
        athleteId,
        athlete,
      });

      try {
        await fetch("/api/recruiting/slots/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            programId,
            sport: "xc",
            eventGroupKey: slot.eventGroupKey,
            slotId: slot.slotId,
            athleteId,
            athleteType: athlete?.type ?? "recruit",
          }),
        });
        await loadSlotAssignments();
      } catch {
        // Best-effort persistence; UI stays optimistic.
      }
    },
    [dispatch, loadSlotAssignments, programId]
  );

  const renderDropZone = React.useCallback(
    (slot: RecruitingSlot) => (
      <SlotDropZone
        programId={programId}
        slot={slot}
        onDropAthlete={(athleteId, athlete) => onDropIntoSlot(slot, athleteId, athlete)}
      />
    ),
    [onDropIntoSlot, programId]
  );

  return (
    <>
      <RecruitingPrimarySurfaceSkeleton
        programId={programId}
        rows={rows}
        expanded={expanded}
        onToggleExpand={onToggleExpand}
        onOpenAthlete={onOpenAthlete}
        onSetPrimary={onSetPrimary}
        onRemoveAthlete={onRemoveAthlete}
        renderDropZone={renderDropZone}
        getSlotHasPrimary={presence.hasPrimary}
      />

      <AthleteFactsModal open={modalOpen} athlete={modalAthlete} onClose={onCloseModal} />
    </>
  );
}
