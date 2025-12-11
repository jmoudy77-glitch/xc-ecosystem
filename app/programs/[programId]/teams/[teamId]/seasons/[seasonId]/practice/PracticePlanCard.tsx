//app/programs/[programId]/teams/[teamId]/seasons/[seasonId]/practice/PracticePlanCard.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

type PracticePlan = {
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
};

type PracticeGroupDetail = {
  id: string;
  label: string;
  event_group: string | null;
  athletes: {
    id: string;
    name: string;
    event_group: string | null;
  }[];
};

type IndividualSessionDetail = {
  id: string;
  athleteName: string;
  event_group: string | null;
  title: string | null;
  workout_category: string | null;
};

type PracticePlanCardProps = {
  plan: PracticePlan;
  programId: string;
  teamId: string;
  seasonId: string;
  groups?: PracticeGroupDetail[];
  individualSessions?: IndividualSessionDetail[];
};

function formatTimeRange(
  startTime: string | null,
  endTime?: string | null
): string | null {
  if (!startTime) return null;

  const start = new Date(startTime);
  if (isNaN(start.getTime())) return null;

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };

  const startLabel = start.toLocaleTimeString("en-US", timeOptions);

  if (!endTime) {
    return startLabel;
  }

  const end = new Date(endTime);
  if (isNaN(end.getTime())) {
    return startLabel;
  }

  const endLabel = end.toLocaleTimeString("en-US", timeOptions);
  return `${startLabel} – ${endLabel}`;
}

export default function PracticePlanCard({
  plan,
  programId,
  teamId,
  seasonId,
  groups = [],
  individualSessions = [],
}: PracticePlanCardProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelNote, setCancelNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timeRange = formatTimeRange(plan.start_time, plan.end_time);

    const dateLabel = plan.practice_date
    ? new Date(plan.practice_date).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Unknown date";

    console.log(
        "[PracticePlanCard] details",
        plan.id,
        "groups:",
        groups.length,
        "individual:",
        individualSessions.length
        );

  const handleCancelClick = () => {
    setIsCancelDialogOpen(true);
  };

  // NOTE: backend cancel isn’t wired yet – this just logs and refreshes.
  const handleConfirmCancel = async () => {
    setIsSubmitting(true);
    try {
        const response = await fetch("/api/practice/cancel", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            practicePlanId: plan.id,
            cancelNote: cancelNote || null,
        }),
        });

        if (!response.ok) {
        console.error(
            "[PracticePlanCard] cancel failed",
            await response.json()
        );
        return;
        }

        setIsCancelDialogOpen(false);
        setIsOpen(false);
        router.refresh();
    } catch (err) {
        console.error("[PracticePlanCard] cancel error", err);
    } finally {
        setIsSubmitting(false);
    }
    };

    const handleEditClick = () => {
        setIsOpen(false);
        const weekParam =
            plan.practice_date ?? new Date().toISOString().slice(0, 10);

        // Add a throwaway timestamp so each click is a unique URL
        const ts = Date.now();

        router.push(
            `/programs/${programId}/teams/${teamId}/seasons/${seasonId}/practice?week=${weekParam}&editPracticeId=${plan.id}&editTs=${ts}`
        );
    };

    const isCanceled = plan.status.toLowerCase() === "canceled";

    const statusLabel = plan.status;
    const statusChipClasses = isCanceled
      ? "border-red-500/80 bg-red-900/60 text-red-100"
      : "border-emerald-500/60 bg-emerald-900/30 text-emerald-100";

  return (
    <>
      {/* Compact card in the calendar column */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
            "w-full rounded-md px-2 py-1.5 text-left " +
            (isCanceled
            ? "border border-red-700/80 bg-red-900/40 hover:border-red-500/80 hover:bg-red-900/60"
            : "border border-slate-700/80 bg-slate-900/80 hover:border-emerald-500/80 hover:bg-slate-900")
        }
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col">
            {timeRange && (
              <div className="text-[10px] text-slate-400">{timeRange}</div>
            )}
            <span className="text-[11px] font-medium text-slate-100">
              {plan.label}
            </span>
          </div>
          <span
            className={
                "rounded-full px-1.5 py-[1px] text-[9px] uppercase tracking-wide " +
                (isCanceled
                ? "border border-red-500/80 bg-red-900/60 text-red-100"
                : "border border-slate-700/80 text-slate-400")
            }
            >
            {plan.status}
          </span>
        </div>
        {plan.location && (
          <div className="mt-0.5 text-[10px] text-slate-500">
            {plan.location}
          </div>
        )}
      </button>

      {/* Popover with details */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 px-3"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-400">
                  Practice details
                </div>
                <div className="text-base font-semibold text-slate-50">
                  {plan.label}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-400">
                  <span>{dateLabel}</span>
                  {timeRange && (
                    <>
                      {" "}
                      · <span>{timeRange}</span>
                    </>
                  )}
                </div>
                {plan.location && (
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    Location:{" "}
                    <span className="font-medium text-slate-200">
                      {plan.location}
                    </span>
                  </div>
                )}
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center rounded-full border px-1.5 py-[1px] text-[10px] uppercase tracking-wide ${statusChipClasses}`}
                  >
                    {statusLabel}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md border border-slate-700 px-2 py-1 text-[10px] text-slate-300 hover:border-slate-500 hover:text-slate-50"
              >
                Close
              </button>
            </div>

            {/* Status / notes */}
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-full border border-slate-700/80 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
                Status: {plan.status}
              </span>
              {plan.notes && (
                <span className="rounded-md border border-slate-700/70 bg-slate-900/70 px-2 py-1 text-[11px] text-slate-200">
                  Notes: {plan.notes}
                </span>
              )}
            </div>

            {/* Sections: general, groups, individual */}
            <div className="space-y-3">
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  General
                </div>
                <div className="rounded-md border border-slate-800 bg-slate-950/80 p-2 text-[11px] text-slate-200">
                  <div>Program ID: {plan.program_id}</div>
                  <div>Team season ID: {plan.team_season_id ?? "—"}</div>
                </div>
              </div>

              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Groups{" "}
                  {groups.length > 0 && (
                    <span className="text-[10px] font-normal text-slate-500">
                      ({groups.length})
                    </span>
                  )}
                </div>
                <div className="space-y-1.5 text-[11px]">
                  {groups.length === 0 ? (
                    <div className="rounded-md border border-slate-800 bg-slate-950/80 p-2 text-slate-500">
                      No group workouts for this practice.
                    </div>
                  ) : (
                    groups.map((group) => (
                      <div
                        key={group.id}
                        className="rounded-md border border-slate-800 bg-slate-950/80 p-2"
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <div className="font-medium text-slate-100">
                            {group.label}
                          </div>
                          {group.event_group && (
                            <div className="rounded-full bg-slate-900 px-2 py-[1px] text-[10px] uppercase tracking-wide text-slate-400">
                              {group.event_group}
                            </div>
                          )}
                        </div>
                        {group.athletes.length === 0 ? (
                          <div className="text-[10px] text-slate-500">
                            No athletes assigned to this group.
                          </div>
                        ) : (
                          <ul className="space-y-0.5 text-[10px] text-slate-300">
                            {group.athletes.map((ath) => (
                              <li
                                key={ath.id}
                                className="flex items-center justify-between"
                              >
                                <span>{ath.name}</span>
                                {ath.event_group && (
                                  <span className="ml-2 rounded bg-slate-900 px-1 py-[1px] text-[9px] uppercase tracking-wide text-slate-500">
                                    {ath.event_group}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Individual assignments{" "}
                  {individualSessions.length > 0 && (
                    <span className="text-[10px] font-normal text-slate-500">
                      ({individualSessions.length})
                    </span>
                  )}
                </div>
                <div className="space-y-1.5 text-[11px]">
                  {individualSessions.length === 0 ? (
                    <div className="rounded-md border border-slate-800 bg-slate-950/80 p-2 text-slate-500">
                      No individual training sessions for this practice.
                    </div>
                  ) : (
                    individualSessions.map((session) => (
                      <div
                        key={session.id}
                        className="rounded-md border border-slate-800 bg-slate-950/80 p-2"
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <div className="font-medium text-slate-100">
                            {session.title || "Session"}
                          </div>
                          {session.event_group && (
                            <div className="rounded-full bg-slate-900 px-2 py-[1px] text-[10px] uppercase tracking-wide text-slate-400">
                              {session.event_group}
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-300">
                          Athlete: {session.athleteName}
                        </div>
                        {session.workout_category && (
                          <div className="mt-0.5 text-[10px] text-slate-400">
                            Category: {session.workout_category}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleCancelClick}
                className="rounded-md border border-red-700/80 bg-red-950/40 px-3 py-1.5 text-[11px] font-semibold text-red-100 hover:border-red-500 hover:bg-red-900/40"
              >
                Cancel practice
              </button>
              <button
                type="button"
                onClick={handleEditClick}
                className="rounded-md border border-emerald-600/80 bg-emerald-900/30 px-3 py-1.5 text-[11px] font-semibold text-emerald-100 hover:border-emerald-400 hover:bg-emerald-800/40"
              >
                Edit practice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel note dialog overlay */}
      {isCancelDialogOpen && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/80 px-3">
          <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs shadow-2xl">
            <div className="mb-2 text-sm font-semibold text-slate-50">
              Cancel this practice?
            </div>
            <p className="mb-2 text-[11px] text-slate-300">
              You can optionally leave a note explaining the cancellation (for
              example, weather, facility conflict, or travel).
            </p>
            <textarea
              value={cancelNote}
              onChange={(e) => setCancelNote(e.target.value)}
              rows={4}
              className="mb-3 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 outline-none ring-0 focus:border-emerald-500"
              placeholder="Add a note for athletes and staff..."
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsCancelDialogOpen(false)}
                className="rounded-md border border-slate-700 px-3 py-1.5 text-[11px] text-slate-300 hover:border-slate-500 hover:text-slate-50 disabled:opacity-60"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmCancel}
                className="rounded-md border border-red-700/80 bg-red-900/40 px-3 py-1.5 text-[11px] font-semibold text-red-100 hover:border-red-500 hover:bg-red-900/60 disabled:opacity-60"
              >
                {isSubmitting ? "Saving..." : "Confirm cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}