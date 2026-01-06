/* File: app/programs/[programId]/meets/builder/page.tsx */
import Link from "next/link";
import { WorkflowHeader } from "@/app/components/meet_manager/WorkflowHeader";

type PageProps = {
  params: Promise<{ programId: string }>;
};

export default async function MeetBuilderLandingPage({ params }: PageProps) {
  const { programId } = await params;

  return (
    <div className="px-6 py-6">
      <WorkflowHeader programId={programId} current="build" />

      <div className="grid grid-cols-12 gap-4">
        {/* LEFT RAIL — Investigate only (no navigation) */}
        <aside className="col-span-12 md:col-span-4">
          <div className="space-y-3">
            <InvestigatePanel title="Build Blocking Issues" count={0} />
            <InvestigatePanel title="Roster Warnings" count={0} />
            <InvestigatePanel title="Entry Conflicts" count={0} />
          </div>
        </aside>

        {/* RIGHT PANEL — Selector / routing only */}
        <main className="col-span-12 md:col-span-8">
          <div className="rounded-md border p-4">
            <h1 className="text-xl font-semibold">Meet Builder</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Select a meet to build your roster and entries.
            </p>

            <div className="mt-4 rounded-md border bg-muted/20 p-4 text-sm">
              Stub: this surface will list hosted and joined meets for the program and route into the
              meet-scoped builder.
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Link
                href={`/programs/${programId}/meets`}
                className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-muted"
              >
                Back to Initiate
              </Link>
            </div>
          </div>
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
