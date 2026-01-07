/* File: app/programs/[programId]/meets/builder/page.tsx */
import { WorkflowHeader } from "@/app/components/meet_manager/WorkflowHeader";
import { BuildMeetSelectorClient } from "@/app/components/meet_manager/BuildMeetSelectorClient";
import { AttendingRosterSelectorClient } from "@/app/components/meet_manager/AttendingRosterSelectorClient";
import { AttendingEntriesEditorClient } from "@/app/components/meet_manager/AttendingEntriesEditorClient";

import { getBuildMeetOptions } from "@/app/actions/meet_manager/getBuildMeetOptions";
import { getProgramAthletesForBuild } from "@/app/actions/meet_manager/getProgramAthletesForBuild";
import { seedMeetEventsForHostedBuild } from "@/app/actions/meet_manager/seedMeetEventsForHostedBuild";
import { getMeetRosterAthleteIds } from "@/app/actions/meet_manager/getMeetRosterAthleteIds";
import { getMeetEventsForEntries } from "@/app/actions/meet_manager/getMeetEventsForEntries";
import { getMeetEntriesForAttendingBuild } from "@/app/actions/meet_manager/getMeetEntriesForAttendingBuild";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";


function supabaseServer() {
  const cookieStore = cookies() as any;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        cookieStore.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });
}


type PageProps = {
  params: Promise<{ programId: string }>;
  searchParams?: Promise<{ attendMeetId?: string; hostMeetId?: string; seed?: string; inserted?: string; error?: string }>;
};

export default async function MeetBuilderPage({ params, searchParams }: PageProps) {
  const { programId } = await params;
  const sp = (await searchParams) ?? {};

  const attendMeetId = sp.attendMeetId ?? "";
  const hostMeetId = sp.hostMeetId ?? "";
  const seedStatus = sp.seed ?? "";
  const seedInserted = sp.inserted ?? "";
  const seedError = sp.error ?? "";

  const isAttending = Boolean(attendMeetId);
  const isHosting = Boolean(hostMeetId) && !isAttending;
  const buildPath = `/programs/${programId}/meets/builder`;

  let options: Awaited<ReturnType<typeof getBuildMeetOptions>> = {
    hosted: [],
    attending: [],
    attendingForHosted: [],
  } as any;

  let loadError: string | null = null;

  try {
  options = await getBuildMeetOptions(programId);

  function supabaseServer(cookieStore: any) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      throw new Error("Missing Supabase env vars.");
    }

    return createServerClient(url, anonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    });
  }
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

  let seedAction: (() => Promise<void>) | null = null;
  let meetEventCount = 0;
  let meetEventTypes: string[] = [];
  let meetEventsError: string | null = null;

  if (isHosting) {
    const selectedMeetId = hostMeetId;

    seedAction = async () => {
      "use server";
      const res = await seedMeetEventsForHostedBuild({
        programId,
        hostMeetId: selectedMeetId,
        builderPath: pagePath,
      });
      if (!res.ok) {
        redirect(
          `${pagePath}?hostMeetId=${selectedMeetId}&seed=error&error=${encodeURIComponent(
            res.error ?? "Seed failed."
          )}`
        );
      }
      redirect(
        `${pagePath}?hostMeetId=${selectedMeetId}&seed=${encodeURIComponent(
          res.status
        )}&inserted=${encodeURIComponent(String(res.inserted ?? 0))}`
      );
    };

    try {
      const cookieStore = (await cookies()) as any;
      const supabase = supabaseServer(cookieStore);

      const { data, error } = await supabase
        .from("meet_events")
        .select("event_type, xc_state, tf_state, field_state, created_at")
        .eq("meet_id", selectedMeetId);

      if (error) {
        meetEventsError = error.message;
      } else {
        meetEventTypes = Array.from(
          new Set((data ?? []).map((r: any) => String(r.event_type ?? "").trim()).filter(Boolean))
        );
        meetEventTypes.sort((a, b) => a.localeCompare(b));
        meetEventCount = meetEventTypes.length;
      }
    } catch (e: any) {
      meetEventsError = e?.message ?? "Failed to load meet events.";
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
        <div className="w-full space-y-4">
          <div className="rounded-md border border-white/15 bg-white/5 p-6">
            <div className="text-lg font-semibold">Hosted meet setup</div>
            <div className="mt-2 text-sm text-white/80">
              This is your hosted meet configuration surface. Initialize meet events so attending teams can build entries.
            </div>
          </div>

          <div className="rounded-md border border-white/15 bg-white/5 p-6">
            {seedStatus === "error" ? (
              <div className="mb-4 rounded-md border border-red-400/30 bg-red-950/20 p-3 text-sm text-white/90">
                <div className="font-semibold">Initialize events failed</div>
                <div className="mt-1 text-white/80">{seedError || "Unknown error."}</div>
              </div>
            ) : seedStatus ? (
              <div className="mb-4 rounded-md border border-white/15 bg-black/20 p-3 text-sm text-white/90">
                <div className="font-semibold">Initialize events</div>
                <div className="mt-1 text-white/80">
                  Status: <span className="font-medium">{seedStatus}</span>
                  {seedInserted ? (
                    <>
                      {" "}
                      • Inserted: <span className="font-medium">{seedInserted}</span>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-semibold">Meet events</div>
                <div className="mt-1 text-sm text-white/70">
                  {meetEventsError
                    ? `Unable to load events: ${meetEventsError}`
                    : meetEventCount > 0
                      ? `${meetEventCount} events configured.`
                      : "No events configured yet."}
                </div>
              </div>
              <form action={seedAction ?? undefined}>
                <button
                  type="submit"
                  className="rounded-md border border-white/20 bg-black/30 px-4 py-2 text-sm text-white hover:bg-black/40"
                >
                  Initialize events
                </button>
              </form>
            </div>

            {meetEventTypes.length > 0 ? (
              <div className="mt-4 rounded-md border border-white/10 bg-black/20 p-3 text-sm text-white/80">
                <div className="font-medium text-white/90">Configured</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {meetEventTypes.map((t) => (
                    <span key={t} className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
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
