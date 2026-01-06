/* File: app/components/meet_manager/CreateMeetFormClient.tsx */
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMeet } from "@/app/actions/meet_manager/createMeet";

type Props = {
  programId: string;
};

export function CreateMeetFormClient({ programId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [meetType, setMeetType] = useState<"XC" | "TF">("XC");
  const [startDate, setStartDate] = useState<string>("");
  const [locationLabel, setLocationLabel] = useState<string>("");
  const [isInvitational, setIsInvitational] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return startDate.trim().length > 0 && !pending;
  }, [startDate, pending]);

  return (
    <div className="rounded-md border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Create a new meet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Creates the meet in draft state and registers your program as HOST.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-muted-foreground">Meet type</span>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={meetType}
            onChange={(e) => setMeetType(e.target.value as any)}
            disabled={pending}
          >
            <option value="XC">XC</option>
            <option value="TF">TF</option>
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-xs font-semibold text-muted-foreground">Start date</span>
          <input
            type="date"
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={pending}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs font-semibold text-muted-foreground">Location (optional)</span>
          <input
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={locationLabel}
            onChange={(e) => setLocationLabel(e.target.value)}
            disabled={pending}
            placeholder="City, State or Venue"
          />
        </label>

        <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
          <div>
            <div className="text-sm font-medium">Invitational</div>
            <div className="text-xs text-muted-foreground">Limits joining to approved programs.</div>
          </div>
          <input
            type="checkbox"
            checked={isInvitational}
            onChange={(e) => setIsInvitational(e.target.checked)}
            disabled={pending}
            className="h-4 w-4"
          />
        </label>

        {error ? (
          <div className="rounded-md border px-3 py-2 text-sm text-red-600">{error}</div>
        ) : null}

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                try {
                  const res = await createMeet({
                    programId,
                    meetType,
                    startDate,
                    locationLabel,
                    isInvitational,
                  });
                  router.push(`/programs/${programId}/meets/${res.meetId}`);
                } catch (e: any) {
                  setError(e?.message ?? "Failed to create meet.");
                }
              })
            }
            className="h-9 rounded-md border bg-background px-3 text-sm hover:bg-muted disabled:opacity-50"
          >
            Create meet
          </button>

          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setMeetType("XC");
              setStartDate("");
              setLocationLabel("");
              setIsInvitational(false);
              setError(null);
            }}
            className="h-9 rounded-md border bg-background px-3 text-sm hover:bg-muted disabled:opacity-50"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
