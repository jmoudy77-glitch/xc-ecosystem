/* File: app/programs/[programId]/meets/builder/page.tsx */
import { WorkflowHeader } from "@/app/components/meet_manager/WorkflowHeader";
import { BuildMeetSelectorClient } from "@/app/components/meet_manager/BuildMeetSelectorClient";
import { AttendingRosterSelectorClient } from "@/app/components/meet_manager/AttendingRosterSelectorClient";
import { getBuildMeetOptions } from "@/app/actions/meet_manager/getBuildMeetOptions";
import { getProgramAthletesForBuild } from "@/app/actions/meet_manager/getProgramAthletesForBuild";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

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

  let athletes = [] as Awaited<ReturnType<typeof getProgramAthletesForBuild>>;
  let rosterAthleteIds = new Set<string>();

  if (isAttending) {
    athletes = await getProgramAthletesForBuild(programId);

    const cookieStore = (await cookies()) as any;
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const { data } = await supabase
      .from("meet_rosters")
      .select("athlete_id")
      .eq("meet_id", attendMeetId);

    rosterAthleteIds = new Set((data ?? []).map((r: any) => r.athlete_id));
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
            meetId={attendMeetId}
            athletes={athletes}
            rosterAthleteIds={rosterAthleteIds}
          />
        </div>
      )}
    </div>
  );
}
