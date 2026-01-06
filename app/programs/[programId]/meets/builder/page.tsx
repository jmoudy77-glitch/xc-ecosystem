/* File: app/programs/[programId]/meets/builder/page.tsx */
import { WorkflowHeader } from "@/app/components/meet_manager/WorkflowHeader";
import { BuildMeetSelectorClient } from "@/app/components/meet_manager/BuildMeetSelectorClient";
import { AttendingRosterSelectorClient } from "@/app/components/meet_manager/AttendingRosterSelectorClient";
import { AttendingEntriesEditorClient } from "@/app/components/meet_manager/AttendingEntriesEditorClient";

import { getBuildMeetOptions } from "@/app/actions/meet_manager/getBuildMeetOptions";
import { getProgramAthletesForBuild } from "@/app/actions/meet_manager/getProgramAthletesForBuild";
import { getMeetRosterAthleteIds } from "@/app/actions/meet_manager/getMeetRosterAthleteIds";
import { getMeetEventsForEntries } from "@/app/actions/meet_manager/getMeetEventsForEntries";
import { getMeetEntriesForAttendingBuild } from "@/app/actions/meet_manager/getMeetEntriesForAttendingBuild";

type PageProps = {
  params: Promise<{ programId: string }>;
  searchParams?: Promise<{ attendMeetId?: string; hostMeetId?: string }>;
};

export default async function MeetBuilderPage({ params, searchParams }: PageProps) {
  const { programId } = await params;
  const sp = (await searchParams) ?? {};

  const attendMeetId = sp.attendMeetId ?? "";
  const isAttending = Boolean(attendMeetId);

  const options = await getBuildMeetOptions(programId);

  let rosterAthleteIds: string[] = [];
  let rosterAthletes: Array<{ athleteId: string; firstName: string; lastName: string }> = [];

  let events: Array<{ eventId: string; eventType: string; scheduledAt: string | null; state: string | null }> = [];
  let entries: Array<{ athleteId: string; eventId: string }> = [];

  if (isAttending) {
    const allAthletes = await getProgramAthletesForBuild(programId);
    rosterAthleteIds = await getMeetRosterAthleteIds(programId, attendMeetId);

    const rosterSet = new Set(rosterAthleteIds);
    rosterAthletes = allAthletes.filter((a) => rosterSet.has(a.athleteId));

    if (rosterAthletes.length > 0) {
      events = await getMeetEventsForEntries(attendMeetId);

      const entryRows = await getMeetEntriesForAttendingBuild(programId, attendMeetId);
      const rosterIdsSet = new Set(rosterAthletes.map((a) => a.athleteId));

      entries = entryRows
        .filter((r) => rosterIdsSet.has(r.athleteId))
        .map((r) => ({ athleteId: r.athleteId, eventId: r.eventId }));
    }
  }

  return (
    <div className="px-6 py-6">
      <WorkflowHeader
        programId={programId}
        current="build"
        rightSlot={
          <BuildMeetSelectorClient
            hosted={options.hosted}
            attending={options.attending}
            attendingForHosted={options.attendingForHosted}
          />
        }
      />

      {!isAttending ? (
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">
            Select an attending meet in the header to begin roster planning.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Roster (primary) */}
          <div className="rounded-md border p-4">
            <h1 className="mb-2 text-lg font-semibold">Who is attending this meet?</h1>

            <AttendingRosterSelectorClient
              programId={programId}
              meetId={attendMeetId}
              athletes={await getProgramAthletesForBuild(programId)}
              rosterAthleteIds={rosterAthleteIds}
            />
          </div>

          {/* Entries (gated by roster readiness) */}
          {rosterAthletes.length === 0 ? (
            <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
              Add at least one athlete to the roster to begin Entries.
            </div>
          ) : (
            <div className="rounded-md border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Entries</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Assign events to roster athletes. Draft by default.
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  Core spine: meet_entries
                </div>
              </div>

              <div className="mt-4">
                <AttendingEntriesEditorClient
                  programId={programId}
                  meetId={attendMeetId}
                  rosterAthletes={rosterAthletes}
                  events={events}
                  entries={entries}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
