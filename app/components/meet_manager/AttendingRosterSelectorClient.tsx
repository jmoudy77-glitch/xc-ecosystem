/* File: app/components/meet_manager/AttendingRosterSelectorClient.tsx */
"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleMeetRosterAthlete } from "@/app/actions/meet_manager/toggleMeetRosterAthlete";
import type { BuildAthlete } from "@/app/actions/meet_manager/getProgramAthletesForBuild";

type Props = {
  programId: string;
  meetId: string;
  athletes: BuildAthlete[];
  rosterAthleteIds: string[];
};

export function AttendingRosterSelectorClient({
  programId,
  meetId,
  athletes,
  rosterAthleteIds,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const rosterSet = useMemo(() => new Set(rosterAthleteIds), [rosterAthleteIds]);

  return (
    <div className="space-y-2">
      {athletes.map((a) => {
        const included = rosterSet.has(a.athleteId);

        return (
          <div
            key={a.athleteId}
            className="flex items-center justify-between rounded-md border px-3 py-2"
          >
            <div className="text-sm">
              {a.lastName}, {a.firstName}
            </div>

            <button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await toggleMeetRosterAthlete(programId, meetId, a.athleteId, !included);
                  router.refresh();
                })
              }
              className={[
                "h-8 rounded-md px-3 text-sm",
                included ? "bg-muted text-foreground" : "border bg-background text-muted-foreground",
              ].join(" ")}
            >
              {included ? "Remove" : "Add"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
