/* File: app/programs/[programId]/meets/builder/page.tsx */
import { WorkflowHeader } from "@/app/components/meet_manager/WorkflowHeader";
import { BuildMeetSelectorClient } from "@/app/components/meet_manager/BuildMeetSelectorClient";
import { AttendingRosterSelectorClient } from "@/app/components/meet_manager/AttendingRosterSelectorClient";
import { getBuildMeetOptions } from "@/app/actions/meet_manager/getBuildMeetOptions";
import { getProgramAthletesForBuild } from "@/app/actions/meet_manager/getProgramAthletesForBuild";
import { getMeetRosterAthleteIds } from "@/app/actions/meet_manager/getMeetRosterAthleteIds";

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

  let athletes = [];
  let rosterAthleteIds: string[] = [];

  if (isAttending) {
    athletes = await getProgramAthletesForBuild(programId);
    rosterAthleteIds = await getMeetRosterAthleteIds(programId, attendMeetId);
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
        <div className="rounded-md border p-4">
          <h1 className="mb-2 text-lg font-semibold">Who is attending this meet?</h1>

          <AttendingRosterSelectorClient
            programId={programId}
            meetId={attendMeetId}
            athletes={athletes}
            rosterAthleteIds={rosterAthleteIds}
          />
        </div>
      )}
    </div>
  );
}
