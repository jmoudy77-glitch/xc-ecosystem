// app/programs/[programId]/(athletic)/recruiting/_components/RecruitingPrimarySurfaceWired.tsx

"use client";

import * as React from "react";
import { RecruitingPrimarySurfaceSkeleton } from "./RecruitingPrimarySurfaceSkeleton";
import { SlotDropZone } from "./RecruitingPrimarySurfaceInteractions";
import { AthleteFactsModal } from "./AthleteFactsModal";
import { useRecruitingSlots } from "./useRecruitingSlots";
import type { RecruitingEventGroupRow, RecruitingSlot, RecruitingAthleteSummary } from "./types";
import { readFavorites, readOriginRegistryEntry } from "@/app/lib/recruiting/portalStorage";

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
      // Recruit discovery portal will consume this to restore to Favorites or Surfaced.
      // Intentionally side-effect free for now.
      console.info("[recruiting] recruit return", ev);
    },
  });

  const [expanded, setExpanded] = React.useState<ExpandedKey>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalAthlete, setModalAthlete] = React.useState<RecruitingAthleteSummary | null>(null);

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
          await fetch("/api/recruiting/favorites/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ programId, sport: "xc", athleteId }),
          });
        } catch {
          // Best-effort delete only.
        }
      }
    },
    [dispatch, programId, rows]
  );

  const renderDropZone = React.useCallback(
    (slot: RecruitingSlot) => (
      <SlotDropZone
        slot={slot}
        onDropAthlete={(athleteId) =>
          dispatch({
            type: "DROP_IN_SLOT",
            eventGroupKey: slot.eventGroupKey,
            slotId: slot.slotId,
            athleteId,
          })
        }
      />
    ),
    [dispatch]
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
      />

      <AthleteFactsModal open={modalOpen} athlete={modalAthlete} onClose={onCloseModal} />
    </>
  );
}
