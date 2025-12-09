//app/programs/[programId]/teams/[teamId]/seasons/[seasonId]/practice/AddPracticeDialogTrigger.tsx
"use client";

import React, { useState } from "react";
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
};

export default function AddPracticeDialogTrigger({
  programId,
  teamId,
  seasonId,
  dateIso,
  groups,
}: AddPracticeDialogTriggerProps) {
  const [open, setOpen] = useState(false);

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
        />
      )}
    </>
  );
}