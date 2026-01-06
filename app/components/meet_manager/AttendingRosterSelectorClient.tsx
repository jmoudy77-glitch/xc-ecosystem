/* File: app/components/meet_manager/AttendingRosterSelectorClient.tsx */
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleMeetRosterAthlete } from "@/app/actions/meet_manager/toggleMeetRosterAthlete";
import type { BuildAthlete } from "@/app/actions/meet_manager/getProgramAthletesForBuild";

type Props = {
  programId: string;
  meetId: string;
  athletes: BuildAthlete[];
  rosterAthleteIds: string[];
};

function fullName(a: BuildAthlete) {
  return `${a.lastName}, ${a.firstName}`.trim();
}

export function AttendingRosterSelectorClient({
  programId,
  meetId,
  athletes,
  rosterAthleteIds,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rosterSet = useMemo(() => new Set(rosterAthleteIds), [rosterAthleteIds]);

  const rosterAthletes = useMemo(() => {
    const selected = athletes.filter((a) => rosterSet.has(a.athleteId));
    selected.sort((a, b) => {
      const ln = a.lastName.localeCompare(b.lastName);
      if (ln !== 0) return ln;
      return a.firstName.localeCompare(b.firstName);
    });
    return selected;
  }, [athletes, rosterSet]);

  const normalizedQuery = query.trim().toLowerCase();

  const availableAthletes = useMemo(() => {
    const notSelected = athletes.filter((a) => !rosterSet.has(a.athleteId));

    if (showAll) {
      return notSelected;
    }

    if (normalizedQuery.length === 0) {
      return [];
    }

    return notSelected.filter((a) => fullName(a).toLowerCase().includes(normalizedQuery));
  }, [athletes, rosterSet, normalizedQuery, showAll]);

  const handleToggle = (athleteId: string, include: boolean) => {
    setError(null);
    startTransition(async () => {
      const res = await toggleMeetRosterAthlete(programId, meetId, athleteId, include);
      if (!res.ok) {
        setError(res.error || "Roster update failed.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="text-sm font-medium">Meet Roster ({rosterAthletes.length})</div>

          <button
            type="button"
            disabled={pending}
            onClick={() => setShowAll((v) => !v)}
            className="h-8 rounded-md border bg-background px-3 text-sm text-muted-foreground"
          >
            {showAll ? "Hide all" : "Browse all"}
          </button>
        </div>

        <div className="p-3">
          {rosterAthletes.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No athletes added yet. Use search below to add athletes to your meet roster.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {rosterAthletes.map((a) => (
                <div
                  key={a.athleteId}
                  className="flex items-center gap-2 rounded-full border bg-background px-3 py-1"
                >
                  <div className="text-sm">{fullName(a)}</div>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => handleToggle(a.athleteId, false)}
                    className="h-7 rounded-full border bg-background px-2 text-sm text-muted-foreground"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-md border">
        <div className="border-b px-3 py-2">
          <div className="text-sm font-medium">Add athletes</div>
          <div className="text-xs text-muted-foreground">
            Search to add athletes. Or use “Browse all” to show the full list.
          </div>
        </div>

        <div className="space-y-3 p-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name…"
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          />

          {error ? (
            <div className="rounded-md border border-destructive/50 bg-background px-3 py-2 text-sm">
              <div className="font-medium">Roster update failed</div>
              <div className="text-muted-foreground">{error}</div>
            </div>
          ) : null}

          {availableAthletes.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              {showAll || normalizedQuery.length > 0
                ? "No matching athletes."
                : "Start typing to search athletes."}
            </div>
          ) : (
            <div className="space-y-2">
              {availableAthletes.map((a) => (
                <div
                  key={a.athleteId}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="text-sm">{fullName(a)}</div>

                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => handleToggle(a.athleteId, true)}
                    className="h-8 rounded-md border bg-background px-3 text-sm text-muted-foreground"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
