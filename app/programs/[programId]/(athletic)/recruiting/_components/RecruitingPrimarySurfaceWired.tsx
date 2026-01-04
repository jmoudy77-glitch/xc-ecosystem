// app/programs/[programId]/(athletic)/recruiting/_components/RecruitingPrimarySurfaceWired.tsx

"use client";

import * as React from "react";
import { RecruitingPrimarySurfaceSkeleton } from "./RecruitingPrimarySurfaceSkeleton";
import { SlotDropZone } from "./RecruitingPrimarySurfaceInteractions";
import { AthleteFactsModal } from "./AthleteFactsModal";
import { useRecruitingSlots } from "./useRecruitingSlots";
import type {
  RecruitingEventGroupRow,
  RecruitingSlot,
  RecruitingAthleteSummary,
} from "./types";

type ExpandedKey = { eventGroupKey: string; slotId: string } | null;

type Props = {
  programId: string;
  initialRows: RecruitingEventGroupRow[];
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

  const onSetPrimary = React.useCallback(
    (eventGroupKey: string, slotId: string, athleteId: string) => {
      dispatch({ type: "SET_PRIMARY", eventGroupKey, slotId, athleteId });
    },
    [dispatch]
  );

  const onRemoveAthlete = React.useCallback(
    (eventGroupKey: string, slotId: string, athleteId: string) => {
      dispatch({ type: "REMOVE_ATHLETE", eventGroupKey, slotId, athleteId });
    },
    [dispatch]
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
