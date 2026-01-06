/* File: app/programs/[programId]/meets/page.tsx */
import { WorkflowHeader } from "@/app/components/meet_manager/WorkflowHeader";

type PageProps = {
  params: Promise<{ programId: string }>;
};

export default async function ProgramMeetsPage({ params }: PageProps) {
  const { programId } = await params;

  return (
    <div className="px-6 py-6">
      <WorkflowHeader programId={programId} current="initiate" />

      <div className="grid grid-cols-12 gap-4">
        {/* LEFT RAIL — Investigate only */}
        <aside className="col-span-12 md:col-span-4">
          <div className="space-y-3">
            <InvestigatePanel title="Join Requests" count={0} />
            <InvestigatePanel title="Roster Issues" count={0} />
            <InvestigatePanel title="Ops Tokens" count={0} />
            <InvestigatePanel title="Results Flags" count={0} />
          </div>
        </aside>

        {/* RIGHT PANEL — Create | Join */}
        <main className="col-span-12 md:col-span-8">
          <div className="rounded-md border">
            <div className="flex border-b">
              <Tab label="Create" active />
              <Tab label="Join" />
            </div>

            <div className="p-4">
              {/* CREATE STUB */}
              <div>
                <h2 className="text-sm font-medium">Create a new meet</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Meet creation form will appear here. Date selection will surface
                  conflicts within 100 miles.
                </p>
              </div>

              <div className="my-6 h-px bg-border" />

              {/* JOIN STUB */}
              <div>
                <h2 className="text-sm font-medium">Join an existing meet</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Map-based discovery with date and radius filters will appear here.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function Tab({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <div
      className={[
        "px-4 py-2 text-sm",
        active
          ? "border-b-2 border-foreground font-medium"
          : "text-muted-foreground",
      ].join(" ")}
    >
      {label}
    </div>
  );
}

function InvestigatePanel({
  title,
  count,
}: {
  title: string;
  count: number;
}) {
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
        {hasItems
          ? "Action required."
          : "No outstanding items."}
      </div>
    </div>
  );
}
