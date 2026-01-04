// app/programs/[programId]/(athletic)/recruiting/_components/AthleteFactsModal.tsx

"use client";

import * as React from "react";
import type { RecruitingAthleteSummary } from "./types";

type Props = {
  open: boolean;
  athlete: RecruitingAthleteSummary | null;
  onClose: () => void;
};

export function AthleteFactsModal({ open, athlete, onClose }: Props) {
  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !athlete) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[min(520px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-subtle bg-surface p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-100">{athlete.displayName}</div>
            <div className="mt-0.5 text-[11px] text-muted">
              Facts-only modal (skeleton). No prescriptive content.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-subtle bg-surface px-2 py-1 text-[11px] text-slate-100 hover:bg-slate-800/40"
            aria-label="Close modal"
          >
            Close
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <FactRow label="Athlete ID" value={athlete.athleteId} mono />
          <FactRow label="Type" value={athlete.type} />
          <FactRow label="Event Group" value={"(wired later)"} />
          <FactRow label="Presence driver" value={"(wired later)"} />
        </div>

        <div className="mt-4 rounded-xl border border-dashed border-subtle bg-slate-900/30 p-3 text-[11px] text-muted">
          Canonical field ordering will be implemented when the fact schema is wired to server view data.
        </div>
      </div>
    </div>
  );
}

function FactRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="text-[11px] text-muted">{label}</div>
      <div className={["text-[11px] text-slate-100", mono ? "font-mono" : ""].join(" ")}>
        {value}
      </div>
    </div>
  );
}
