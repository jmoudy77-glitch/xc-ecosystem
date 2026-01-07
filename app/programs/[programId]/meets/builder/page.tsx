import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import { seedMeetEventsForHostedBuild } from "@/app/actions/meet_manager/seedMeetEventsForHostedBuild";

type MeetBuilderSearchParams = {
  hostMeetId?: string;
  attendingMeetId?: string;
  seed?: string;
  inserted?: string;
  seed_error?: string;
};

function supabaseServer() {
  const cookieStore = cookies() as any;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          if (cookieStore && typeof cookieStore.get === "function") {
            return cookieStore.get(name)?.value;
          }
          if (cookieStore && typeof cookieStore.getAll === "function") {
            return cookieStore.getAll().find((c: any) => c?.name === name)?.value;
          }
          return undefined;
        },
        set(name: string, value: string, options: any) {
          if (cookieStore && typeof cookieStore.set === "function") {
            cookieStore.set({ name, value, ...options });
          }
        },
        remove(name: string, options: any) {
          if (cookieStore && typeof cookieStore.delete === "function") {
            cookieStore.delete({ name, ...options });
          }
        },
      },
    }
  );
}

function Banner({
  kind,
  title,
  message,
}: {
  kind: "error" | "success" | "info";
  title: string;
  message: string;
}) {
  const base = "border rounded-md px-4 py-3 text-sm";
  const kindClass =
    kind === "error"
      ? "border-red-800/60 bg-red-950/30 text-red-100"
      : kind === "success"
      ? "border-emerald-800/50 bg-emerald-950/25 text-emerald-100"
      : "border-white/10 bg-white/5 text-white/80";

  return (
    <div className={`${base} ${kindClass}`}>
      <div className="font-semibold">{title}</div>
      <div className="mt-1 opacity-90">{message}</div>
    </div>
  );
}

export default async function MeetBuilderPage({
  params,
  searchParams,
}: {
  params: { programId: string };
  searchParams: MeetBuilderSearchParams;
}) {
  const programId = params.programId;
  const supabase = supabaseServer();

  // Builder path for redirects/revalidation
  const buildPath = `/programs/${programId}/meets/builder`;

  // If hostMeetId is absent, auto-select the latest hosted draft meet for this program.
  let selectedHostedMeetId = (searchParams.hostMeetId ?? "").trim();

  if (!selectedHostedMeetId) {
    const { data: fallbackMeet, error: fallbackErr } = await supabase
      .from("meets")
      .select("id")
      .eq("host_program_id", programId)
      .eq("lifecycle_state", "draft")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!fallbackErr && fallbackMeet?.id) {
      selectedHostedMeetId = String(fallbackMeet.id);
      // Normalize URL so subsequent actions keep hostMeetId in the querystring.
      redirect(`${buildPath}?hostMeetId=${encodeURIComponent(selectedHostedMeetId)}`);
    }
  }

  const attendingMeetId = (searchParams.attendingMeetId ?? "").trim();

  // Server action: seed hosted meet events from event_definitions
  const seedAction = async () => {
    "use server";

    if (!selectedHostedMeetId) {
      redirect(`${buildPath}?seed=missing-host`);
    }

    const res = await seedMeetEventsForHostedBuild({
      meetId: selectedHostedMeetId,
      buildPathToRevalidate: buildPath,
    });

    if (!res.ok) {
      redirect(
        `${buildPath}?hostMeetId=${encodeURIComponent(
          selectedHostedMeetId
        )}&seed=error&seed_error=${encodeURIComponent(res.error ?? "Seed failed.")}`
      );
    }

    redirect(
      `${buildPath}?hostMeetId=${encodeURIComponent(
        selectedHostedMeetId
      )}&seed=ok&inserted=${encodeURIComponent(String(res.inserted ?? 0))}`
    );
  };

  // Read current meet events for hosted meet (if selected)
  let meetEvents: Array<{
    event_type: string;
    xc_state: string | null;
    tf_state: string | null;
    field_state: string | null;
  }> = [];
  let meetEventsLoadError: string | null = null;

  if (selectedHostedMeetId) {
    const { data, error } = await supabase
      .from("meet_events")
      .select("event_type, xc_state, tf_state, field_state")
      .eq("meet_id", selectedHostedMeetId)
      .order("event_type", { ascending: true });

    if (error) meetEventsLoadError = error.message;
    meetEvents = (data as any) ?? [];
  }

  const meetEventCount = meetEvents.length;
  const meetEventTypes = Array.from(new Set(meetEvents.map((e) => e.event_type)));

  // Banner states (seed action feedback)
  const seedStatus = searchParams.seed ?? "";
  const inserted = searchParams.inserted ?? "";
  const seedError = searchParams.seed_error ?? "";

  return (
    <div className="w-full">
      <div className="mx-auto max-w-5xl px-6 pt-6 pb-10">
        <div className="border border-white/10 bg-white/5 rounded-lg px-6 py-5">
          <div className="text-xl font-semibold">Hosted meet setup</div>
          <div className="mt-2 text-sm text-white/70">
            This is your hosted meet configuration surface. Initialize meet events so attending teams can build entries.
          </div>
        </div>

        <div className="mt-6 border border-white/10 bg-white/5 rounded-lg px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-base font-semibold">Meet events</div>
              <div className="mt-1 text-sm text-white/70">
                {selectedHostedMeetId
                  ? meetEventCount > 0
                    ? `${meetEventCount} event(s) configured.`
                    : "No events configured yet."
                  : "No hosted meet selected (and no draft hosted meet exists for this program)."}
              </div>
            </div>

            {selectedHostedMeetId ? (
              <form action={seedAction}>
                <button
                  type="submit"
                  className="border border-white/15 bg-white/10 hover:bg-white/15 rounded-md px-4 py-2 text-sm"
                >
                  Initialize events
                </button>
              </form>
            ) : null}
          </div>

          <div className="mt-4 space-y-3">
            {seedStatus === "missing-host" ? (
              <Banner
                kind="error"
                title="Initialize events failed"
                message="No hosted meet is selected."
              />
            ) : null}

            {seedStatus === "error" ? (
              <Banner
                kind="error"
                title="Initialize events failed"
                message={seedError || "Seed failed."}
              />
            ) : null}

            {seedStatus === "ok" ? (
              <Banner
                kind="success"
                title="Initialize events complete"
                message={`Seeded/upserted ${inserted || "0"} event(s).`}
              />
            ) : null}

            {meetEventsLoadError ? (
              <Banner
                kind="error"
                title="Unable to load meet events"
                message={meetEventsLoadError}
              />
            ) : null}

            {selectedHostedMeetId && meetEventCount > 0 ? (
              <div className="border border-white/10 bg-black/20 rounded-md px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-white/60">Event types</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {meetEventTypes.map((t) => (
                    <div
                      key={t}
                      className="border border-white/15 bg-white/5 rounded-full px-3 py-1 text-sm"
                    >
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-8 border border-white/10 bg-white/5 rounded-lg px-6 py-5">
          <div className="text-lg font-semibold">Attending</div>
          <div className="mt-2 text-sm text-white/70">
            Attending meet builder is handled via the attending meet selection flow.
          </div>
          <div className="mt-3 text-sm text-white/60">
            Selected attending meet: {attendingMeetId ? attendingMeetId : "None"}
          </div>
        </div>
      </div>
    </div>
  );
}
