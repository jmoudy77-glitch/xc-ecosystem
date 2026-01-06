/* File: app/programs/[programId]/meets/[meetId]/builder/page.tsx */
import Link from "next/link";
import { WorkflowHeader } from "@/app/components/meet_manager/WorkflowHeader";

type PageProps = {
  params: Promise<{ programId: string; meetId: string }>;
};

export default async function MeetBuilderWorkspacePage({ params }: PageProps) {
  const { programId, meetId } = await params;

  return (
    <div className="px-6 py-6">
      <WorkflowHeader programId={programId} current="build" />

      <div className="grid grid-cols-12 gap-4">
        {/* LEFT RAIL — Investigate only (no navigation) */}
        <aside className="col-span-12 md:col-span-4">
          <div className="space-y-3">
            <InvestigatePanel title="Roster readiness" count={0} subtitle="Missing athletes, eligibility, or incomplete profiles." />
            <InvestigatePanel title="Entry conflicts" count={0} subtitle="Over-entries, event overlaps, or rule constraints." />
            <InvestigatePanel title="Host updates" count={0} subtitle="Event changes from host that may affect your plan." />
          </div>

          <div className="mt-4 rounded-md border p-3">
            <div className="text-sm font-medium">Meet context</div>
            <div className="mt-2 text-xs text-muted-foreground">
              Meet ID
            </div>
            <div className="mt-1 font-mono text-xs">{meetId}</div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link
                href={`/programs/${programId}/meets/builder`}
                className="inline-flex h-8 items-center rounded-md border px-2 text-xs hover:bg-muted"
              >
                Change meet
              </Link>
              <Link
                href={`/programs/${programId}/meets/${meetId}`}
                className="inline-flex h-8 items-center rounded-md border px-2 text-xs hover:bg-muted"
              >
                Meet home
              </Link>
            </div>
          </div>
        </aside>

        {/* RIGHT PANEL — Builder workspace */}
        <main className="col-span-12 md:col-span-8">
          <div className="rounded-md border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold">Meet Builder</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Build your roster and entries for this meet. Changes here affect only your program’s participation.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled
                  className="inline-flex h-9 items-center rounded-md border px-3 text-sm text-muted-foreground"
                  aria-disabled="true"
                  title="Coming next: roster and entry editing"
                >
                  Add athlete
                </button>
                <button
                  type="button"
                  disabled
                  className="inline-flex h-9 items-center rounded-md border px-3 text-sm text-muted-foreground"
                  aria-disabled="true"
                  title="Coming next: entry planning actions"
                >
                  Add entry
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <SectionCard
                title="Roster"
                description="Select the athletes attending and define your meet roster."
                rightMeta="Core spine: meet_rosters"
              >
                <EmptyState
                  title="Roster planning not wired yet"
                  body="Next: load roster for this meet and allow add/remove athletes under program authority."
                />
              </SectionCard>

              <SectionCard
                title="Entries"
                description="Assign athletes to events and manage entry counts."
                rightMeta="Core spine: meet_entries"
              >
                <EmptyState
                  title="Entries not wired yet"
                  body="Next: render your program’s entries and support add/update/delete within locked invariants."
                />
              </SectionCard>

              <SectionCard
                title="Events"
                description="View meet events and any host updates that affect planning."
                rightMeta="Core spine: meet_events (Option A states)"
              >
                <EmptyState
                  title="Events feed not wired yet"
                  body="Next: read meet events and surface planning-relevant changes; host-only edits remain capability-gated."
                />
              </SectionCard>
            </div>

            <div className="mt-6 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
              Locked scope (v1.2): no heats/flights modeling, attempt-by-attempt field scoring, scoring abstractions, or display materialization.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function InvestigatePanel({
  title,
  count,
  subtitle,
}: {
  title: string;
  count: number;
  subtitle: string;
}) {
  const hasItems = count > 0;
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">{title}</div>
          <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
        </div>
        <div
          className={[
            "shrink-0 rounded-full px-2 py-0.5 text-xs",
            hasItems ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground",
          ].join(" ")}
        >
          {count}
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  rightMeta,
  children,
}: {
  title: string;
  description: string;
  rightMeta: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">{title}</div>
          <div className="mt-1 text-sm text-muted-foreground">{description}</div>
        </div>
        <div className="shrink-0 text-xs text-muted-foreground">{rightMeta}</div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border bg-muted/20 p-4">
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{body}</div>
    </div>
  );
}
