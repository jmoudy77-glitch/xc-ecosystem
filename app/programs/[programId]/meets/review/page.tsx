/* File: app/programs/[programId]/meets/review/page.tsx */
import Link from "next/link";
import { WorkflowHeader } from "@/app/components/meet_manager/WorkflowHeader";

type PageProps = {
  params: Promise<{ programId: string }>;
};

export default async function MeetReviewLandingPage({ params }: PageProps) {
  const { programId } = await params;

  return (
    <div className="px-6 py-6">
      <WorkflowHeader programId={programId} current="review" />

      <div className="grid grid-cols-12 gap-4">
        {/* LEFT RAIL — Investigate only (no navigation) */}
        <aside className="col-span-12 md:col-span-4">
          <div className="space-y-3">
            <InvestigatePanel title="Results Pending Publication" count={0} />
            <InvestigatePanel title="Revision Alerts" count={0} />
            <InvestigatePanel title="Archive Notes" count={0} />
          </div>
        </aside>

        {/* RIGHT PANEL — Selector / routing only */}
        <main className="col-span-12 md:col-span-8">
          <div className="rounded-md border p-4">
            <h1 className="text-xl font-semibold">Review</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Select a completed meet to review results and archives.
            </p>

            <div className="mt-4 rounded-md border bg-muted/20 p-4 text-sm">
              Stub: this surface will list completed/archived meets for the program and route into the
              meet-scoped review workspace.
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
