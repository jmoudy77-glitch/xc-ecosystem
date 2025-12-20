//app/programs/[programId]/teams/[teamId]/seasons/[seasonId]/practice/PracticePlanCard.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassModalShell }  from "@/components/ui/GlassModalShell";

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
    ? "border-red-500/60 bg-red-900/40 text-red-100"
    : "border-[color:var(--brand)]/50 bg-[color:var(--brand)]/15 text-[color:var(--foreground)]";

  return (
    <>
      {/* Compact card in the calendar column */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          "w-full rounded-md px-2 py-1.5 text-left ring-1 transition-colors " +
          (isCanceled
            ? "ring-red-500/45 bg-red-950/18 hover:bg-red-950/28"
            : "bg-panel-muted/35 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl hover:bg-panel-muted/50")
        }
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col">
            {timeRange && (
              <div className="text-[10px] text-[var(--muted-foreground)]">{timeRange}</div>
            )}
            <span className="text-[11px] font-medium text-[var(--foreground)]">
              {plan.label}
            </span>
          </div>
          <span
            className={
              "rounded-full px-1.5 py-[1px] text-[9px] uppercase tracking-wide ring-1 " +
              (isCanceled
                ? "ring-red-500/50 bg-red-950/25 text-red-100"
                : "bg-panel-muted/35 text-[var(--muted-foreground)] ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl")
            }
          >
            {plan.status}
          </span>
        </div>
        {plan.location && (
          <div className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">
            {plan.location}
          </div>
        )}
      </button>

      {/* Popover with details */}
      <GlassModalShell
        open={isOpen}
        onClose={() => setIsOpen(false)}
        maxWidthClassName="max-w-lg"
        heightClassName="h-auto"
      >
        <div className="relative w-full overflow-hidden rounded-xl p-4 text-xs">
          <div className="relative">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">
                  Practice details
                </div>
                <div className="text-base font-semibold text-[var(--foreground)]">
                  {plan.label}
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                  <span>{dateLabel}</span>
                  {timeRange && (
                    <>
                      {" "}
                      · <span>{timeRange}</span>
                    </>
                  )}
                </div>
                {plan.location && (
                  <div className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                    Location:{" "}
                    <span className="font-medium text-[var(--foreground)]">
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
                className="rounded-md px-2 py-1 text-[10px] text-[var(--foreground)] bg-panel-muted/35 ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl hover:bg-panel-muted/50 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/35"
              >
                Close
              </button>
            </div>

            {/* Status / notes */}
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--muted-foreground)] bg-panel-muted/35 ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
                Status: {plan.status}
              </span>
              {plan.notes && (
                <span className="rounded-md px-2 py-1 text-[11px] text-[var(--foreground)] bg-panel-muted/35 ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
                  Notes: {plan.notes}
                </span>
              )}
            </div>

            {/* Sections: general, groups, individual */}
            <div className="space-y-3">
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                  General
                </div>
                <div className="rounded-md p-2 text-[11px] text-[var(--foreground)] bg-panel-muted/35 ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
                  <div>Program ID: {plan.program_id}</div>
                  <div>Team season ID: {plan.team_season_id ?? "—"}</div>
                </div>
              </div>

              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                  Groups{" "}
                  {groups.length > 0 && (
                    <span className="text-[10px] font-normal text-[var(--muted-foreground)]">
                      ({groups.length})
                    </span>
                  )}
                </div>
                <div className="space-y-1.5 text-[11px]">
                  {groups.length === 0 ? (
                    <div className="rounded-md p-2 text-[var(--muted-foreground)] bg-panel-muted/25 ring-1 ring-white/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
                      No group workouts for this practice.
                    </div>
                  ) : (
                    groups.map((group) => (
                      <div
                        key={group.id}
                        className="rounded-md p-2 bg-panel-muted/35 ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl"
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <div className="font-medium text-[var(--foreground)]">
                            {group.label}
                          </div>
                          {group.event_group && (
                            <div className="rounded-full bg-panel-muted/35 px-2 py-[1px] text-[10px] uppercase tracking-wide text-[var(--muted-foreground)] ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
                              {group.event_group}
                            </div>
                          )}
                        </div>
                        {group.athletes.length === 0 ? (
                          <div className="text-[10px] text-[var(--muted-foreground)]">
                            No athletes assigned to this group.
                          </div>
                        ) : (
                          <ul className="space-y-0.5 text-[10px] text-[var(--foreground)]">
                            {group.athletes.map((ath) => (
                              <li
                                key={ath.id}
                                className="flex items-center justify-between"
                              >
                                <span>{ath.name}</span>
                                {ath.event_group && (
                                  <span className="ml-2 rounded bg-panel-muted/35 px-1 py-[1px] text-[9px] uppercase tracking-wide text-[var(--muted-foreground)] ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
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
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                  Individual assignments{" "}
                  {individualSessions.length > 0 && (
                    <span className="text-[10px] font-normal text-[var(--muted-foreground)]">
                      ({individualSessions.length})
                    </span>
                  )}
                </div>
                <div className="space-y-1.5 text-[11px]">
                  {individualSessions.length === 0 ? (
                    <div className="rounded-md p-2 text-[var(--muted-foreground)] bg-panel-muted/25 ring-1 ring-white/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
                      No individual training sessions for this practice.
                    </div>
                  ) : (
                    individualSessions.map((session) => (
                      <div
                        key={session.id}
                        className="rounded-md p-2 bg-panel-muted/35 ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl"
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <div className="font-medium text-[var(--foreground)]">
                            {session.title || "Session"}
                          </div>
                          {session.event_group && (
                            <div className="rounded-full bg-panel-muted/35 px-2 py-[1px] text-[10px] uppercase tracking-wide text-[var(--muted-foreground)] ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
                              {session.event_group}
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] text-[var(--foreground)]">
                          Athlete: {session.athleteName}
                        </div>
                        {session.workout_category && (
                          <div className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">
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
                className="rounded-md px-3 py-1.5 text-[11px] font-semibold text-red-100 ring-1 ring-red-500/60 bg-red-950/30 hover:bg-red-950/45"
              >
                Cancel practice
              </button>
              <button
                type="button"
                onClick={handleEditClick}
                className="rounded-md px-3 py-1.5 text-[11px] font-semibold text-[var(--foreground)] ring-1 ring-[color:var(--brand)]/50 bg-[color:var(--brand)]/15 hover:bg-[color:var(--brand)]/22"
              >
                Edit practice
              </button>
            </div>
          </div>
        </div>
      </GlassModalShell>

      {/* Cancel note dialog overlay */}
      <GlassModalShell
        open={isCancelDialogOpen}
        onClose={() => setIsCancelDialogOpen(false)}
        maxWidthClassName="max-w-md"
        heightClassName="h-auto"
      >
        <div className="relative w-full overflow-hidden rounded-xl p-4 text-xs">
          <div className="relative">
            <div className="mb-2 text-sm font-semibold text-[var(--foreground)]">
              Cancel this practice?
            </div>
            <p className="mb-2 text-[11px] text-[var(--muted-foreground)]">
              You can optionally leave a note explaining the cancellation (for
              example, weather, facility conflict, or travel).
            </p>
            <textarea
              value={cancelNote}
              onChange={(e) => setCancelNote(e.target.value)}
              rows={4}
              className="mb-3 w-full rounded-md bg-panel-muted/35 px-3 py-2 text-[11px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl hover:bg-panel-muted/45 focus:ring-2 focus:ring-[var(--brand)]/35 focus:outline-none"
              placeholder="Add a note for athletes and staff..."
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsCancelDialogOpen(false)}
                className="rounded-md px-3 py-1.5 text-[11px] text-[var(--foreground)] bg-panel-muted/35 ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl hover:bg-panel-muted/50 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/35 disabled:opacity-60"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmCancel}
                className="rounded-md px-3 py-1.5 text-[11px] font-semibold text-red-100 ring-1 ring-red-500/60 bg-red-950/30 hover:bg-red-950/50 disabled:opacity-60"
              >
                {isSubmitting ? "Saving..." : "Confirm cancel"}
              </button>
            </div>
          </div>
        </div>
      </GlassModalShell>
    </>
  );
}