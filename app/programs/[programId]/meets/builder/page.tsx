/* File: app/programs/[programId]/meets/builder/page.tsx */
import { WorkflowHeader } from "@/app/components/meet_manager/WorkflowHeader";
import { BuildMeetSelectorClient } from "@/app/components/meet_manager/BuildMeetSelectorClient";
import { getBuildMeetOptions } from "@/app/actions/meet_manager/getBuildMeetOptions";

type PageProps = {
  params: Promise<{ programId: string }>;
  searchParams?: Promise<{ hostMeetId?: string; attendMeetId?: string }>;
};

export default async function MeetBuilderPage({ params, searchParams }: PageProps) {
  const { programId } = await params;
  const sp = (await searchParams) ?? {};

  const hostMeetId = sp.hostMeetId ?? "";
  const attendMeetId = sp.attendMeetId ?? "";
  const selectedMeetId = hostMeetId || attendMeetId;
  const selectedRole: "HOST" | "ATTENDEE" | null = hostMeetId ? "HOST" : attendMeetId ? "ATTENDEE" : null;

  const options = await getBuildMeetOptions(programId);

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

      <div className="grid grid-cols-12 gap-4">
        {/* LEFT RAIL — Investigate only */}
        <aside className="col-span-12 md:col-span-4">
          <div className="space-y-3">
            <InvestigatePanel title="Roster readiness" count={0} />
            <InvestigatePanel title="Entry conflicts" count={0} />
            <InvestigatePanel title="Host updates" count={0} />
          </div>

          {selectedMeetId ? (
            <div className="mt-4 rounded-md border p-3">
              <div className="text-sm font-medium">Build context</div>
              <div className="mt-2 text-xs text-muted-foreground">Meet</div>
              <div className="mt-1 font-mono text-xs">{selectedMeetId}</div>
              <div className="mt-2 text-xs text-muted-foreground">Role</div>
              <div className="mt-1 text-xs">{selectedRole}</div>
            </div>
          ) : (
            <div className="mt-4 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
              Select a hosted or attending meet in the header to begin Build.
            </div>
          )}
        </aside>

        {/* RIGHT PANEL — gated workspace */}
        <main className="col-span-12 md:col-span-8">
          {!selectedMeetId ? (
            <div className="rounded-md border p-4">
              <h1 className="text-xl font-semibold">Meet Builder</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a meet context in the header to start planning.
              </p>
              <div className="mt-4 rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
                Locked contract: meet selection happens inside Build (no separate selection page).
              </div>
            </div>
          ) : (
            <div className="rounded-md border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl font-semibold">Meet Builder</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedRole === "HOST"
                      ? "Host context: meet configuration surfaces will appear here (capability-gated)."
                      : "Attendee context: roster and entries planning surfaces will appear here."}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3">
                <SectionCard
                  title={selectedRole === "HOST" ? "Meet configuration (host)" : "Roster"}
                  description={
                    selectedRole === "HOST"
                      ? "Stub: host-authoritative meet configuration surfaces (events, structure) will be implemented here."
                      : "Stub: roster-first planning begins here (who is attending)."
                  }
                />
                <SectionCard
                  title={selectedRole === "HOST" ? "Participant planning (host as attendee)" : "Entries"}
                  description={
                    selectedRole === "HOST"
                      ? "Stub: build your own roster/entries for the hosted meet by selecting the attending context in the header."
                      : "Stub: allocate athletes to events under locked invariants."
                  }
                />
                <SectionCard
                  title="Events"
                  description="Stub: meet events visibility and planning-relevant updates (Option A states)."
                />
              </div>

              <div className="mt-6 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                Locked scope (v1.2): no heats/flights modeling, attempt-by-attempt field scoring, scoring abstractions, or display materialization.
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function InvestigatePanel({ title, count }: { title: string; count: number }) {
  const hasItems = count > 0;
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{title}</div>
        <div
          className={[
            "rounded-full px-2 py-0.5 text-xs",
            hasItems ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground",
          ].join(" ")}
        >
          {count}
        </div>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        {hasItems ? "Action required." : "No outstanding items."}
      </div>
    </div>
  );
}

function SectionCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-md border p-4">
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{description}</div>
    </div>
  );
}
