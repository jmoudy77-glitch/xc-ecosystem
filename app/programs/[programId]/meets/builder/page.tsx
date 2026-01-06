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
  const hostMeetId = sp.hostMeetId ?? "";

  const isAttending = Boolean(attendMeetId);
  const isHosting = Boolean(hostMeetId) && !isAttending;

  let options: Awaited<ReturnType<typeof getBuildMeetOptions>> = {
    hosted: [],
    attending: [],
    attendingForHosted: [],
  } as any;

  let loadError: string | null = null;

  try {
    options = await getBuildMeetOptions(programId);
  } catch (e: any) {
    loadError = e?.message ? String(e.message) : "Failed to load meet options.";
  }

  let allAthletes: Array<{ athleteId: string; firstName: string; lastName: string }> = [];
  let rosterAthleteIds: string[] = [];
  let rosterAthletes: Array<{ athleteId: string; firstName: string; lastName: string }> = [];
  let events: Array<{ eventId: string; eventType: string; scheduledAt: string | null; state: string | null }> = [];
  let entries: Array<{ athleteId: string; eventId: string }> = [];

  if (isAttending) {
    try {
      allAthletes = await getProgramAthletesForBuild(programId);
    } catch (e: any) {
      loadError =
        e?.message
          ? `Failed to load athletes. ${String(e.message)}`
          : "Failed to load athletes.";
      allAthletes = [];
    }

    try {
      rosterAthleteIds = await getMeetRosterAthleteIds(programId, attendMeetId);
    } catch (e: any) {
      loadError =
        e?.message
          ? `Failed to load meet roster. ${String(e.message)}`
          : "Failed to load meet roster.";
      rosterAthleteIds = [];
    }

    const rosterSet = new Set(rosterAthleteIds);
    rosterAthletes = allAthletes.filter((a) => rosterSet.has(a.athleteId));

    if (rosterAthletes.length > 0) {
      try {
        events = await getMeetEventsForEntries(attendMeetId);
      } catch (e: any) {
        loadError =
          e?.message
            ? `Failed to load meet events. ${String(e.message)}`
            : "Failed to load meet events.";
        events = [];
      }

      try {
        const entryRows = await getMeetEntriesForAttendingBuild(programId, attendMeetId);
        const rosterIdsSet = new Set(rosterAthletes.map((a) => a.athleteId));

        entries = entryRows
          .filter((r) => rosterIdsSet.has(r.athleteId))
          .map((r) => ({ athleteId: r.athleteId, eventId: r.eventId }));
      } catch (e: any) {
        loadError =
          e?.message
            ? `Failed to load meet entries. ${String(e.message)}`
            : "Failed to load meet entries.";
        entries = [];
      }
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

      {loadError ? (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-4">
          <div className="text-sm font-medium">Build could not load required data.</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {loadError}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            This is an enforced empty-state (non-crashing). Fix the upstream error before proceeding.
          </div>
        </div>
      ) : null}

      {!isAttending && !isHosting ? (
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">
            Select a meet in the header to begin Build.
          </p>
          <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
            <li>Attending: build roster and draft entries.</li>
            <li>Hosted: configure meet structure and events (wiring in progress).</li>
          </ul>
        </div>
      ) : isHosting ? (
        <div className="space-y-4">
          <div className="rounded-md border p-4">
            <h1 className="mb-2 text-lg font-semibold">Hosted meet selected</h1>
            <p className="text-sm text-muted-foreground">
              Hosted Build is not yet wired to configuration UI. This page now renders an enforced empty-state instead of a no-op.
            </p>
            <div className="mt-3 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
              hostMeetId: {hostMeetId}
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              Next wiring targets (no new features implied):
              <ul className="mt-2 list-disc pl-5">
                <li>Show hosted build guidance + required artifacts checklist.</li>
                <li>Render minimal config stub when artifacts are missing.</li>
                <li>Prevent silent selections by always presenting a visible next action.</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-md border p-4">
            <h1 className="mb-2 text-lg font-semibold">Who is attending this meet?</h1>

            <AttendingRosterSelectorClient
              programId={programId}
              meetId={attendMeetId}
              athletes={allAthletes}
              rosterAthleteIds={rosterAthleteIds}
            />
          </div>

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
