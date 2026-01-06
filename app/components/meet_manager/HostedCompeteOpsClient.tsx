/* File: app/components/meet_manager/HostedCompeteOpsClient.tsx */
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMeetEventState } from "@/app/actions/meet_manager/setMeetEventState";
import { hostInsertResultRevision } from "@/app/actions/meet_manager/hostInsertResultRevision";
import type { HostOpsEntry, HostOpsEvent } from "@/app/actions/meet_manager/getHostedCompeteOps";

type Props = {
  meetId: string;
  events: HostOpsEvent[];
  selectedEventId: string | null;
  entries: HostOpsEntry[];
};

function eventLabel(e: HostOpsEvent) {
  const dt = e.scheduledAt ? ` • ${e.scheduledAt}` : "";
  const st = e.state ? ` • ${e.state}` : "";
  return `${e.eventType}${dt}${st}`;
}

export function HostedCompeteOpsClient({ meetId, events, selectedEventId, entries }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const selectedEvent = useMemo(
    () => events.find((e) => e.eventId === selectedEventId) ?? null,
    [events, selectedEventId]
  );

  const [stateValue, setStateValue] = useState<string>(selectedEvent?.state ?? "");
  const [draftByAthlete, setDraftByAthlete] = useState<Record<string, string>>({});

  // Keep stateValue coherent as selection changes
  useMemo(() => {
    setStateValue(selectedEvent?.state ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId]);

  const onSelectEvent = (eid: string) => {
    const url = new URL(window.location.href);
    if (eid) url.searchParams.set("eventId", eid);
    else url.searchParams.delete("eventId");
    router.push(url.pathname + "?" + url.searchParams.toString());
  };

  const onApplyState = () => {
    if (!selectedEvent) return;
    if (!stateValue) return;

    startTransition(async () => {
      await setMeetEventState(selectedEvent.eventId, selectedEvent.eventType as any, stateValue);
      router.refresh();
    });
  };

  const onSaveProvisional = (athleteId: string) => {
    if (!selectedEvent) return;
    const summary = (draftByAthlete[athleteId] ?? "").trim();
    if (!summary) return;

    startTransition(async () => {
      await hostInsertResultRevision({
        meetId,
        eventId: selectedEvent.eventId,
        athleteId,
        publicationState: "provisional",
        summary,
      });
      router.refresh();
    });
  };

  const onPublish = (athleteId: string) => {
    if (!selectedEvent) return;
    const summary = (draftByAthlete[athleteId] ?? "").trim();
    if (!summary) return;

    startTransition(async () => {
      // Publish is a new revision; append-only.
      await hostInsertResultRevision({
        meetId,
        eventId: selectedEvent.eventId,
        athleteId,
        publicationState: "published",
        summary,
      });
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">Hosted Ops</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Host-only controls. Results are append-only revisions. Publishing inserts a new revision.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">Meet: {meetId}</div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold text-muted-foreground">Event</div>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={selectedEventId ?? ""}
              onChange={(e) => onSelectEvent(e.target.value)}
              disabled={pending}
            >
              <option value="">Select event…</option>
              {events.map((ev) => (
                <option key={ev.eventId} value={ev.eventId}>
                  {eventLabel(ev)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold text-muted-foreground">State</div>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={stateValue}
              onChange={(e) => setStateValue(e.target.value)}
              disabled={pending || !selectedEvent}
            >
              <option value="">Select…</option>
              {selectedEvent?.eventType === "FIELD" ? (
                <>
                  <option value="open">open</option>
                  <option value="closed">closed</option>
                </>
              ) : (
                <>
                  <option value="not_started">not_started</option>
                  <option value="in_progress">in_progress</option>
                  <option value="paused">paused</option>
                  <option value="completed">completed</option>
                </>
              )}
            </select>

            <button
              type="button"
              disabled={pending || !selectedEvent || !stateValue}
              onClick={onApplyState}
              className="h-9 rounded-md border bg-background px-3 text-sm hover:bg-muted disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-md border p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Results Entry</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Minimal entry: store a single summary string in result_payload.summary.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {selectedEvent ? `Event: ${selectedEvent.eventId}` : "No event selected"}
          </div>
        </div>

        {!selectedEvent ? (
          <div className="mt-4 text-sm text-muted-foreground">Select an event to enter results.</div>
        ) : entries.length === 0 ? (
          <div className="mt-4 text-sm text-muted-foreground">No entries found for this event.</div>
        ) : (
          <div className="mt-4 space-y-2">
            {entries.map((en) => {
              const key = en.athleteId;
              const draft = draftByAthlete[key] ?? "";
              const latest =
                en.latestResultSummary
                  ? `${en.latestResultSummary} • ${en.latestPublicationState ?? ""} • rev ${en.latestRevisionNumber ?? ""}`
                  : null;

              return (
                <div key={en.athleteId} className="rounded-md border px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-medium">
                      {en.lastName}, {en.firstName}
                      <span className="ml-2 text-xs text-muted-foreground">({en.entryState})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        value={draft}
                        onChange={(e) =>
                          setDraftByAthlete((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        disabled={pending}
                        placeholder="Result summary…"
                        className="h-9 w-[240px] rounded-md border bg-background px-2 text-sm"
                      />

                      <button
                        type="button"
                        disabled={pending || !draft.trim()}
                        onClick={() => onSaveProvisional(en.athleteId)}
                        className="h-9 rounded-md border bg-background px-3 text-sm hover:bg-muted disabled:opacity-50"
                      >
                        Save provisional
                      </button>

                      <button
                        type="button"
                        disabled={pending || !draft.trim()}
                        onClick={() => onPublish(en.athleteId)}
                        className="h-9 rounded-md border bg-background px-3 text-sm hover:bg-muted disabled:opacity-50"
                      >
                        Publish
                      </button>
                    </div>
                  </div>

                  {latest ? (
                    <div className="mt-2 text-xs text-muted-foreground">Latest: {latest}</div>
                  ) : (
                    <div className="mt-2 text-xs text-muted-foreground">Latest: none</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
