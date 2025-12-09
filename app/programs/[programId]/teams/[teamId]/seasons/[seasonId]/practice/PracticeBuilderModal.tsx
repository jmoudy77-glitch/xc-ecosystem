//app/programs/[programId]/teams/[teamId]/seasons/[seasonId]/practice/PracticeBuilderModal.tsx

"use client";

import React, { useState } from "react";

type PracticeBuilderModalProps = {
  open: boolean;
  onClose: () => void;
  programId: string;
  teamId: string;
  seasonId: string;
  dateIso: string;
  displayDate: string;
  groups: {
    name: string;
    athletes: { id: string; name: string }[];
  }[];
};

export default function PracticeBuilderModal({
  open,
  onClose,
  programId,
  teamId,
  seasonId,
  dateIso,
  displayDate,
  groups,
}: PracticeBuilderModalProps) {
  if (!open) return null;

  const [showIndividualPanel, setShowIndividualPanel] = useState(false);
  const safeGroups = groups ?? [];
  const groupsToRender =
    safeGroups.length > 0
      ? safeGroups
      : [
          { name: "Distance", athletes: [] },
          { name: "Mid Distance", athletes: [] },
          { name: "Sprints", athletes: [] },
          { name: "Throws", athletes: [] },
        ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-3 py-4">
      <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
          <div className="space-y-1">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Practice builder
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-100">
              <span className="font-semibold">New practice – {displayDate}</span>
              <span className="rounded-full border border-slate-700/80 px-2 py-0.5 text-[11px] text-slate-300">
                Program: {programId}
              </span>
              <span className="rounded-full border border-slate-700/80 px-2 py-0.5 text-[11px] text-slate-300">
                Team: {teamId}
              </span>
              <span className="rounded-full border border-slate-700/80 px-2 py-0.5 text-[11px] text-slate-300">
                Season: {seasonId}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700/80 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500 hover:text-slate-50"
          >
            Close
          </button>
        </div>

        {/* Practice info row */}
        <div className="border-b border-slate-800 px-5 py-3 text-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Practice label
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                placeholder="e.g. Tempo Tuesday – 6x1k"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Date
              </label>
              <input
                type="date"
                defaultValue={dateIso}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Start time
                </label>
                <input
                  type="time"
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  End time
                </label>
                <input
                  type="time"
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Location
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                placeholder="Track, trails, weight room..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Notes
              </label>
              <textarea
                className="h-9 w-full resize-none rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                placeholder="Key focus, cues, adjustments..."
              />
            </div>
          </div>
        </div>

        {/* Main body: group canvas + individual panel + libraries */}
        <div className="flex flex-1 overflow-hidden">
          {/* Group assignment section */}
          <div className="flex min-w-[40%] flex-[2] flex-col border-r border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
              <div className="text-sm font-semibold text-slate-100">
                Group assignments
              </div>
              <button
                type="button"
                onClick={() => setShowIndividualPanel((v) => !v)}
                className="rounded-md border border-slate-700/80 px-2 py-1 text-[11px] text-slate-200 hover:border-emerald-500 hover:text-emerald-200"
              >
                {showIndividualPanel
                  ? "Hide individual assignments"
                  : "Individual assignments ▸"}
              </button>
            </div>

            <div className="flex-1 overflow-auto px-4 py-3 text-sm">
              <div className="space-y-3">
                {groupsToRender.map((group) => (
                  <div
                    key={group.name}
                    className="rounded-md border border-slate-800 bg-slate-950/80 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-xs font-semibold text-slate-100">
                        {group.name}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {group.athletes.length} athletes • 0 workouts
                      </span>
                    </div>
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {group.athletes.map((ath) => (
                        <span
                          key={ath.id}
                          className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-200"
                        >
                          {ath.name}
                        </span>
                      ))}
                    </div>
                    <div className="rounded-md border border-dashed border-slate-700/80 bg-slate-900/40 px-2 py-3 text-[11px] text-slate-400">
                      Drop workouts or training events here to assign to this
                      group. (Drag &amp; drop coming soon.)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Individual assignments panel (slides in between groups and libraries) */}
          {showIndividualPanel && (
            <div className="flex w-72 flex-col border-r border-slate-800 bg-slate-950/95">
              <div className="border-b border-slate-800 px-3 py-2.5">
                <div className="text-xs font-semibold text-slate-100">
                  Individual assignments
                </div>
                <div className="text-[11px] text-slate-500">
                  Drag athletes and attach custom work for special cases.
                </div>
              </div>
              <div className="flex-1 overflow-auto px-3 py-2 text-sm">
                {/* Placeholder content */}
                <div className="space-y-2 text-[11px] text-slate-300">
                  <div className="rounded-md border border-slate-800 bg-slate-900/70 p-2">
                    <div className="mb-1 text-xs font-semibold">
                      Athletes (example)
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {["J. Smith", "A. Garcia", "L. Chen"].map((name) => (
                        <span
                          key={name}
                          className="rounded-full border border-slate-700 bg-slate-950 px-2 py-0.5 text-[11px]"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-md border border-dashed border-slate-700 bg-slate-900/40 p-2">
                    Drop individualized workouts or events here per athlete.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Libraries: workouts + training events */}
          <div className="flex min-w-[28%] flex-1 flex-col bg-slate-950">
            <div className="flex border-b border-slate-800 text-xs">
              <button className="flex-1 border-r border-slate-800 px-3 py-2.5 text-left font-semibold text-slate-100">
                Workouts
              </button>
              <button className="flex-1 px-3 py-2.5 text-left text-slate-400">
                Training events
              </button>
            </div>
            <div className="flex-1 overflow-auto px-3 py-2 text-sm">
              {/* Placeholder workout list */}
              <div className="space-y-2 text-[11px] text-slate-300">
                <div className="rounded-md border border-slate-800 bg-slate-900/70 p-2">
                  <div className="text-xs font-semibold">
                    6x1k @ Threshold
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Classic tempo session.
                  </div>
                </div>
                <div className="rounded-md border border-slate-800 bg-slate-900/70 p-2">
                  <div className="text-xs font-semibold">
                    10x200m Speed Development
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Short, fast reps with full recovery.
                  </div>
                </div>
                <div className="rounded-md border border-slate-800 bg-slate-900/70 p-2">
                  <div className="text-xs font-semibold">Easy Run 45′</div>
                  <div className="text-[10px] text-slate-400">
                    General aerobic maintenance.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-5 py-3 text-xs">
          <div className="text-slate-500">
            Summary of assigned groups, athletes, and load will appear here.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500 hover:text-slate-100"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-50 hover:bg-emerald-500"
            >
              Save practice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
