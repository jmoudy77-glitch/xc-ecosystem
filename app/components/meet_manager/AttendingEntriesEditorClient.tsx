/* File: app/components/meet_manager/AttendingEntriesEditorClient.tsx */
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleMeetEntry } from "@/app/actions/meet_manager/toggleMeetEntry";
import type { BuildAthlete } from "@/app/actions/meet_manager/getProgramAthletesForBuild";
import type { MeetEventOption } from "@/app/actions/meet_manager/getMeetEventsForEntries";

type Props = {
  programId: string;
  meetId: string;
  rosterAthletes: BuildAthlete[];
  events: MeetEventOption[];
  entries: Array<{ athleteId: string; eventId: string }>;
};

function eventLabel(e: MeetEventOption) {
  const dt = e.scheduledAt ? ` • ${e.scheduledAt}` : "";
  const st = e.state ? ` • ${e.state}` : "";
  return `${e.eventType}${dt}${st}`;
}

export function AttendingEntriesEditorClient({
  programId,
  meetId,
  rosterAthletes,
  events,
  entries,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const entriesByAthlete = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const a of rosterAthletes) map[a.athleteId] = [];
    for (const r of entries) {
      if (!map[r.athleteId]) map[r.athleteId] = [];
      map[r.athleteId].push(r.eventId);
    }
    return map;
  }, [rosterAthletes, entries]);

  const [selectedEventByAthlete, setSelectedEventByAthlete] = useState<Record<string, string>>({});

  const onAdd = (athleteId: string) => {
    const eventId = selectedEventByAthlete[athleteId] ?? "";
    if (!eventId) return;

    startTransition(async () => {
      await toggleMeetEntry(programId, meetId, athleteId, eventId, true);
      router.refresh();
    });
  };

  const onRemove = (athleteId: string, eventId: string) => {
    startTransition(async () => {
      await toggleMeetEntry(programId, meetId, athleteId, eventId, false);
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      {rosterAthletes.map((a) => {
        const athleteEntries = entriesByAthlete[a.athleteId] ?? [];
        return (
          <div key={a.athleteId} className="rounded-md border p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">
                {a.lastName}, {a.firstName}
              </div>

              <div className="flex items-center gap-2">
                <select
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                  value={selectedEventByAthlete[a.athleteId] ?? ""}
                  onChange={(e) =>
                    setSelectedEventByAthlete((prev) => ({
                      ...prev,
                      [a.athleteId]: e.target.value,
                    }))
                  }
                  disabled={pending || events.length === 0}
                >
                  <option value="">Select event…</option>
                  {events.map((ev) => (
                    <option key={ev.eventId} value={ev.eventId}>
                      {eventLabel(ev)}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={pending || events.length === 0 || !(selectedEventByAthlete[a.athleteId] ?? "")}
                  onClick={() => onAdd(a.athleteId)}
                  className="h-9 rounded-md border bg-background px-3 text-sm hover:bg-muted disabled:opacity-50"
                >
                  Add entry
                </button>
              </div>
            </div>

            <div className="mt-3">
              {athleteEntries.length === 0 ? (
                <div className="text-sm text-muted-foreground">No entries yet.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {athleteEntries.map((eventId) => {
                    const ev = events.find((x) => x.eventId === eventId);
                    const label = ev ? eventLabel(ev) : `Event • ${eventId}`;
                    return (
                      <button
                        key={`${a.athleteId}:${eventId}`}
                        type="button"
                        disabled={pending}
                        onClick={() => onRemove(a.athleteId, eventId)}
                        className="inline-flex items-center rounded-full border px-3 py-1 text-xs hover:bg-muted disabled:opacity-50"
                        title="Remove entry"
                      >
                        {label} <span className="ml-2 text-muted-foreground">×</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
