/* File: app/programs/[programId]/meets/[meetId]/ops/page.tsx */
import { WorkflowHeader } from "@/app/components/meet_manager/WorkflowHeader";
import { getAttendingCompeteReadOnly } from "@/app/actions/meet_manager/getAttendingCompeteReadOnly";

type PageProps = {
  params: Promise<{ programId: string; meetId: string }>;
};

function eventLabel(e: { eventType: string; scheduledAt: string | null; state: string | null }) {
  const dt = e.scheduledAt ? ` • ${e.scheduledAt}` : "";
  const st = e.state ? ` • ${e.state}` : "";
  return `${e.eventType}${dt}${st}`;
}

export default async function MeetOpsWorkspacePage({ params }: PageProps) {
  const { programId, meetId } = await params;

  const data = await getAttendingCompeteReadOnly(programId, meetId);

  const eventsById = new Map(data.events.map((e) => [e.eventId, e]));
  const entriesByAthlete = new Map<string, string[]>();
  for (const a of data.rosterAthletes) entriesByAthlete.set(a.athleteId, []);
  for (const en of data.entries) {
    if (!entriesByAthlete.has(en.athleteId)) entriesByAthlete.set(en.athleteId, []);
    entriesByAthlete.get(en.athleteId)!.push(en.eventId);
  }

  const resultsByAthlete = new Map<string, Array<{ eventId: string; payload: any; publicationState: string }>>();
  for (const r of data.results) {
    if (!resultsByAthlete.has(r.athleteId)) resultsByAthlete.set(r.athleteId, []);
    resultsByAthlete.get(r.athleteId)!.push({
      eventId: r.eventId,
      payload: r.resultPayload,
      publicationState: r.publicationState,
    });
  }

  return (
    <div className="px-6 py-6">
      <WorkflowHeader programId={programId} current="compete" />

      <div className="mt-4 space-y-4">
        {/* Live events (read-only) */}
        <div className="rounded-md border p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold">Live Events</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Read-only view for attending coaches. Published results only.
              </p>
            </div>
            <div className="text-xs text-muted-foreground">Meet: {meetId}</div>
          </div>

          <div className="mt-4 space-y-2">
            {data.events.length === 0 ? (
              <div className="text-sm text-muted-foreground">No events available.</div>
            ) : (
              data.events.map((e) => (
                <div key={e.eventId} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="text-sm">{eventLabel(e)}</div>
                  <div className="text-xs text-muted-foreground">{e.eventId}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* My athletes (read-only) */}
        <div className="rounded-md border p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">My Athletes</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Entries and published results for your rostered athletes.
              </p>
            </div>
            <div className="text-xs text-muted-foreground">Program: {programId}</div>
          </div>

          {data.rosterAthletes.length === 0 ? (
            <div className="mt-4 text-sm text-muted-foreground">
              No rostered athletes found for this meet. Add athletes in Build before Compete.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {data.rosterAthletes.map((a) => {
                const entryEventIds = entriesByAthlete.get(a.athleteId) ?? [];
                const athleteResults = resultsByAthlete.get(a.athleteId) ?? [];

                return (
                  <div key={a.athleteId} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium">
                        {a.lastName}, {a.firstName}
                      </div>
                      <div className="text-xs text-muted-foreground">{a.athleteId}</div>
                    </div>

                    <div className="mt-3">
                      <div className="text-xs font-semibold text-muted-foreground">Entries</div>
                      {entryEventIds.length === 0 ? (
                        <div className="mt-1 text-sm text-muted-foreground">No entries.</div>
                      ) : (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {entryEventIds.map((eid) => {
                            const ev = eventsById.get(eid);
                            const label = ev ? eventLabel(ev) : `Event • ${eid}`;
                            return (
                              <div key={`${a.athleteId}:${eid}`} className="rounded-full border px-3 py-1 text-xs">
                                {label}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="mt-3">
                      <div className="text-xs font-semibold text-muted-foreground">Published Results</div>
                      {athleteResults.length === 0 ? (
                        <div className="mt-1 text-sm text-muted-foreground">No published results yet.</div>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {athleteResults.map((r, idx) => {
                            const ev = eventsById.get(r.eventId);
                            const label = ev ? eventLabel(ev) : `Event • ${r.eventId}`;
                            const summary =
                              r?.payload && typeof r.payload === "object"
                                ? (r.payload.summary ?? r.payload.time ?? r.payload.mark ?? null)
                                : null;

                            return (
                              <div key={`${a.athleteId}:${r.eventId}:${idx}`} className="flex items-center justify-between rounded-md border px-3 py-2">
                                <div className="text-sm">
                                  {label}
                                  {summary ? <span className="text-muted-foreground"> • {String(summary)}</span> : null}
                                </div>
                                <div className="text-xs text-muted-foreground">{r.publicationState}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
