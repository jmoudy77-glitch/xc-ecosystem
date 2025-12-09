//app/programs/[programId]/teams/[teamId]/seasons/[seasonId]/practice/AddPracticeDialogTrigger.tsx
"use client";

import React, { useState } from "react";

const EVENT_GROUP_BUCKETS = [
  { id: "distance", label: "Distance" },
  { id: "mid_distance", label: "Mid-distance" },
  { id: "sprints", label: "Sprints" },
  { id: "hurdles", label: "Hurdles" },
  { id: "jumps", label: "Jumps" },
  { id: "throws", label: "Throws" },
  { id: "xc", label: "Cross country" },
] as const;

type AddPracticeDialogTriggerProps = {
  programId: string;
  teamId: string;
  seasonId: string;
  dateIso: string; // YYYY-MM-DD
};

export default function AddPracticeDialogTrigger({
  programId,
  teamId,
  seasonId,
  dateIso,
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

      {/* Simple modal-style dialog; we’ll evolve this into full drag-and-drop builder */}
      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-4xl rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  New practice
                </p>
                <h2 className="text-sm font-semibold text-slate-100">
                  {displayDate}
                </h2>
                <p className="mt-1 text-[11px] text-slate-500">
                  We&apos;ll build this practice using drag-and-drop from your
                  saved practice plans and global training events.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-slate-700/80 bg-slate-900/80 px-2 py-1 text-[11px] text-slate-300 hover:border-slate-500 hover:text-slate-100"
              >
                Close
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1.4fr)_minmax(0,1.15fr)]">
              {/* Column A: previously created practice plans */}
              <section className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                <h3 className="mb-1 text-xs font-semibold text-slate-200">
                  Previous practice plans
                </h3>
                <p className="mb-2 text-[11px] text-slate-500">
                  You&apos;ll be able to drag whole practices you&apos;ve used
                  before into this new session.
                </p>
                <div className="rounded-md border border-dashed border-slate-700/80 bg-slate-950/80 p-3 text-[11px] text-slate-500">
                  Placeholder: list of saved practices for{" "}
                  <code className="font-mono text-[10px]">{teamId}</code> /{" "}
                  <code className="font-mono text-[10px]">{seasonId}</code>.
                </div>
              </section>

              {/* Column B: central builder drop zone with event-group buckets */}
              <section className="rounded-lg border border-emerald-700/70 bg-slate-950/80 p-3">
                <h3 className="mb-1 text-xs font-semibold text-slate-200">
                  Practice builder
                </h3>
                <p className="mb-2 text-[11px] text-slate-500">
                  Drag items from the left or right into event-group slots
                  below. Each bucket represents a training group for this
                  practice.
                </p>
                <div className="space-y-2">
                  {EVENT_GROUP_BUCKETS.map((bucket) => (
                    <div
                      key={bucket.id}
                      className="rounded-md border border-dashed border-slate-700/80 bg-slate-950/90 px-2 py-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium text-slate-100">
                          {bucket.label} group
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Drop workouts or practice templates here
                        </span>
                      </div>
                      <div className="mt-1 rounded-sm border border-slate-800/80 bg-slate-950/90 px-2 py-1 text-[10px] text-slate-500">
                        Builder placeholder for{" "}
                        <code className="font-mono text-[10px]">
                          {bucket.id}
                        </code>{" "}
                        assignments. We&apos;ll wire this to real drag-and-drop
                        and server actions next.
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Column C: global training events / workouts */}
              <section className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                <h3 className="mb-1 text-xs font-semibold text-slate-200">
                  Global training events
                </h3>
                <p className="mb-2 text-[11px] text-slate-500">
                  Drag workouts or training templates onto the builder to define
                  group sessions.
                </p>
                <div className="rounded-md border border-dashed border-slate-700/80 bg-slate-950/80 p-3 text-[11px] text-slate-500">
                  Placeholder: list of workouts/templates for{" "}
                  <code className="font-mono text-[10px]">{programId}</code>.
                </div>
              </section>
            </div>

            {/* Builder footer placeholder */}
            <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-3">
              <p className="text-[10px] text-slate-500">
                Next step: add a central builder area as a drop zone, then
                connect this dialog to the existing{" "}
                <code className="font-mono text-[10px]">createPracticePlan</code>{" "}
                server action.
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-emerald-500/70 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-medium text-emerald-100 hover:border-emerald-400 hover:bg-emerald-500/20"
              >
                Done for now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}