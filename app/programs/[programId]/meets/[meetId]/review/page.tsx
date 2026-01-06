/* File: app/programs/[programId]/meets/[meetId]/review/page.tsx */
import { WorkflowHeader } from "@/app/components/meet_manager/WorkflowHeader";
import { isMeetHost } from "@/app/actions/meet_manager/isMeetHost";
import { getMeetReviewReadOnly } from "@/app/actions/meet_manager/getMeetReviewReadOnly";

type PageProps = {
  params: Promise<{ programId: string; meetId: string }>;
};

function eventLabel(e: { eventType: string; scheduledAt: string | null; state: string | null }) {
  const dt = e.scheduledAt ? ` • ${e.scheduledAt}` : "";
  const st = e.state ? ` • ${e.state}` : "";
  return `${e.eventType}${dt}${st}`;
}

export default async function MeetReviewPage({ params }: PageProps) {
  const { programId, meetId } = await params;

  const host = await isMeetHost(meetId);
  const data = await getMeetReviewReadOnly({
    programId,
    meetId,
    includeProvisional: host,
  });

  const eventsById = new Map(data.events.map((e) => [e.eventId, e]));

  // Map athlete -> entries
  const entryEventIdsByAthlete = new Map<string, string[]>();
  for (const a of data.rosterAthletes) entryEventIdsByAthlete.set(a.athleteId, []);
  for (const en of data.entries) {
    if (!entryEventIdsByAthlete.has(en.athleteId)) entryEventIdsByAthlete.set(en.athleteId, []);
    entryEventIdsByAthlete.get(en.athleteId)!.push(en.eventId);
  }

  // Latest visible result per athlete+event (by created_at order already desc)
  const latestResultKey = (athleteId: string, eventId: string) => `${athleteId}:${eventId}`;
  const latestByAthleteEvent = new Map<
    string,
    { publicationState: string; revisionNumber: number; payload: any; createdAt: string }
  >();

  for (const r of data.results) {
    const key = latestResultKey(r.athleteId, r.eventId);
    if (latestByAthleteEvent.has(key)) continue;
    latestByAthleteEvent.set(key, {
      publicationState: r.publicationState,
      revisionNumber: r.revisionNumber,
      payload: r.resultPayload,
      createdAt: r.createdAt,
    });
  }

  // Event-centric rollup: event -> rows for roster athletes that are entered
  const rosterById = new Map(data.rosterAthletes.map((a) => [a.athleteId, a]));
  const eventRows: Array<{
    eventId: string;
    athleteId: string;
    athleteName: string;
    resultSummary: string | null;
    publicationState: string | null;
    revisionNumber: number | null;
  }> = [];

  for (const en of data.entries) {
    const athlete = rosterById.get(en.athleteId);
    if (!athlete) continue;

    const lr = latestByAthleteEvent.get(latestResultKey(en.athleteId, en.eventId)) ?? null;
    const summary =
      lr?.payload && typeof lr.payload === "object"
        ? (lr.payload.summary ?? lr.payload.time ?? lr.payload.mark ?? null)
        : null;

    eventRows.push({
      eventId: en.eventId,
      athleteId: en.athleteId,
      athleteName: `${athlete.lastName}, ${athlete.firstName}`,
      resultSummary: summary ? String(summary) : null,
      publicationState: lr?.publicationState ?? null,
      revisionNumber: lr?.revisionNumber ?? null,
    });
  }

  // Group by eventId
  const rowsByEvent = new Map<string, typeof eventRows>();
  for (const row of eventRows) {
    if (!rowsByEvent.has(row.eventId)) rowsByEvent.set(row.eventId, []);
    rowsByEvent.get(row.eventId)!.push(row);
  }
  for (const [eid, rows] of rowsByEvent.entries()) {
    rows.sort((a, b) => a.athleteName.localeCompare(b.athleteName));
    rowsByEvent.set(eid, rows);
  }

  const rosterCount = data.rosterAthletes.length;
  const entriesCount = data.entries.length;
  const visibleResultsCount = latestByAthleteEvent.size;

  return (
    <div className="px-6 py-6">
      <WorkflowHeader programId={programId} current="review" />

      <div className="mt-4 space-y-4">
        {/* Program recap (minimal) */}
        <div className="rounded-md border p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold">Review</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Read-only post-meet summary. {host ? "Host audit view includes provisional." : "Published results only."}
              </p>
            </div>
            <div className="text-xs text-muted-foreground">Meet: {meetId}</div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border p-3">
              <div className="text-xs font-semibold text-muted-foreground">Rostered Athletes</div>
              <div className="mt-1 text-2xl font-semibold">{rosterCount}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs font-semibold text-muted-foreground">Entries</div>
              <div className="mt-1 text-2xl font-semibold">{entriesCount}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs font-semibold text-muted-foreground">Visible Result Lines</div>
              <div className="mt-1 text-2xl font-semibold">{visibleResultsCount}</div>
            </div>
          </div>
        </div>

        {/* Event Results (primary) */}
        <div className="rounded-md border p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Event Results</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Events with entries for your roster. Results reflect latest visible revision per athlete.
              </p>
            </div>
            <div className="text-xs text-muted-foreground">{data.events.length} events</div>
          </div>

          <div className="mt-4 space-y-3">
            {data.events.length === 0 ? (
              <div className="text-sm text-muted-foreground">No events available.</div>
            ) : (
              data.events.map((ev) => {
                const rows = rowsByEvent.get(ev.eventId) ?? [];
                const hasAny = rows.length > 0;

                return (
                  <div key={ev.eventId} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold">{eventLabel(ev)}</div>
                      <div className="text-xs text-muted-foreground">{ev.eventId}</div>
                    </div>

                    {!hasAny ? (
                      <div className="mt-2 text-sm text-muted-foreground">No roster entries for this event.</div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {rows.map((r) => (
                          <div
                            key={`${r.athleteId}:${r.eventId}`}
                            className="flex items-center justify-between rounded-md border px-3 py-2"
                          >
                            <div className="text-sm">
                              {r.athleteName}
                              {r.resultSummary ? (
                                <span className="text-muted-foreground"> • {r.resultSummary}</span>
                              ) : (
                                <span className="text-muted-foreground"> • no result</span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {r.publicationState ? `${r.publicationState} • rev ${r.revisionNumber ?? ""}` : "—"}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* My Athletes (primary for attendee) */}
        <div className="rounded-md border p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">My Athletes</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Entries and latest visible results for rostered athletes.
              </p>
            </div>
            <div className="text-xs text-muted-foreground">Program: {programId}</div>
          </div>

          {data.rosterAthletes.length === 0 ? (
            <div className="mt-4 text-sm text-muted-foreground">
              No rostered athletes found for this meet.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {data.rosterAthletes.map((a) => {
                const entryEventIds = entryEventIdsByAthlete.get(a.athleteId) ?? [];

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
                            const lr = latestByAthleteEvent.get(latestResultKey(a.athleteId, eid)) ?? null;
                            const summary =
                              lr?.payload && typeof lr.payload === "object"
                                ? (lr.payload.summary ?? lr.payload.time ?? lr.payload.mark ?? null)
                                : null;

                            return (
                              <div key={`${a.athleteId}:${eid}`} className="rounded-full border px-3 py-1 text-xs">
                                {label}
                                {summary ? <span className="text-muted-foreground"> • {String(summary)}</span> : null}
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
