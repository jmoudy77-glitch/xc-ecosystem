/* File: app/programs/[programId]/meets/page.tsx */
import { WorkflowHeader } from "@/app/components/meet_manager/WorkflowHeader";
import { CreateMeetFormClient } from "@/app/components/meet_manager/CreateMeetFormClient";

type PageProps = {
  params: Promise<{ programId: string }>;
  searchParams?: Promise<{ tab?: string }>;
};

export default async function MeetsInitiateLandingPage({ params, searchParams }: PageProps) {
  const { programId } = await params;
  const sp = (await searchParams) ?? {};
  const tab = (sp.tab ?? "create") as "create" | "join";

  return (
    <div className="px-6 py-6">
      <WorkflowHeader programId={programId} current="initiate" />

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_2fr]">
        {/* Left column: triage / guidance */}
        <div className="rounded-md border p-4">
          <h1 className="text-lg font-semibold">Meet Manager</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Initiate sets the meet context. Build, Compete, and Review operate on that context.
          </p>

          <div className="mt-4 rounded-md border p-3">
            <div className="text-sm font-semibold">Workflow</div>
            <div className="mt-1 text-sm text-muted-foreground">Initiate → Build → Compete → Review</div>
          </div>
        </div>

        {/* Right column: Create / Join */}
        <div className="rounded-md border p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Initiate</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Create a new meet or join an existing meet.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`/programs/${programId}/meets?tab=create`}
                aria-disabled={tab === "create"}
                className={[
                  "h-9 rounded-md px-3 text-sm inline-flex items-center border",
                  tab === "create" ? "bg-muted text-foreground pointer-events-none" : "bg-background hover:bg-muted",
                ].join(" ")}
              >
                Create
              </a>
              <a
                href={`/programs/${programId}/meets?tab=join`}
                aria-disabled={tab === "join"}
                className={[
                  "h-9 rounded-md px-3 text-sm inline-flex items-center border",
                  tab === "join" ? "bg-muted text-foreground pointer-events-none" : "bg-background hover:bg-muted",
                ].join(" ")}
              >
                Join
              </a>
            </div>
          </div>

          <div className="mt-4">
            {tab === "create" ? (
              <CreateMeetFormClient programId={programId} />
            ) : (
              <div className="rounded-md border p-4">
                <h2 className="text-base font-semibold">Join an existing meet</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Join flow is not implemented yet. This panel will become the date/radius map filter surface.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
