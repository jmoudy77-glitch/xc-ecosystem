"use client";

import React, { useEffect, useState } from "react";
import PracticeBuilderModal from "./PracticeBuilderModal";

type AddPracticeDialogTriggerProps = {
  programId: string;
  teamId: string;
  seasonId: string;
  dateIso: string; // YYYY-MM-DD
  groups: {
    name: string;
    athletes: { id: string; name: string }[];
  }[];
  // Optional: when editing an existing practice
  initialPractice?: {
    id: string;
    program_id: string;
    team_season_id: string | null;
    practice_date: string;
    start_time: string | null;
    end_time: string | null;
    location: string | null;
    label: string;
    notes: string | null;
    status: string;
  } | null;
  initialDetails?: {
    groups: {
      id: string;
      label: string;
      event_group: string | null;
      athletes: {
        id: string;
        name: string;
        event_group: string | null;
      }[];
    }[];
    individualSessions: {
      id: string;
      athleteName: string;
      event_group: string | null;
      title: string | null;
      workout_category: string | null;
    }[];
  } | null;
  autoOpen?: boolean;
};

export default function AddPracticeDialogTrigger({
  programId,
  teamId,
  seasonId,
  dateIso,
  groups,
  initialPractice,
  initialDetails,
  autoOpen,
}: AddPracticeDialogTriggerProps) {
  const [open, setOpen] = useState(false);

  // If invoked in edit mode with autoOpen, open the modal on mount
  useEffect(() => {
    if (autoOpen) {
      setOpen(true);
    }
  }, [autoOpen]);

  const dateObj = new Date(dateIso);
  const displayDate = isNaN(dateObj.getTime())
    ? dateIso
    : dateObj.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });

  return (
    <>
      {/* Placeholder card at top of day stack */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-md border border-dashed border-emerald-600/60 bg-emerald-500/5 px-2 py-1.5 text-left text-[11px] text-emerald-100 hover:border-emerald-400 hover:bg-emerald-500/15"
      >
        <span className="font-medium">Add new practice</span>
        <span className="text-[13px] leading-none">＋</span>
      </button>

      {open && (
        <PracticeBuilderModal
          open={open}
          onClose={() => setOpen(false)}
          programId={programId}
          teamId={teamId}
          seasonId={seasonId}
          dateIso={dateIso}
          displayDate={displayDate}
          groups={groups}
          initialPractice={initialPractice ?? undefined}
          initialDetails={initialDetails ?? undefined}
        />
      )}
    </>
  );
}