/* File: app/programs/[programId]/meets/[meetId]/ops/page.tsx */
import Link from "next/link";
import { WorkflowHeader } from "@/app/components/meet_manager/WorkflowHeader";

type PageProps = {
  params: Promise<{ programId: string; meetId: string }>;
};

export default async function MeetOpsWorkspacePage({ params }: PageProps) {
  const { programId, meetId } = await params;

  return (
    <div className="px-6 py-6">
      <WorkflowHeader programId={programId} current="compete" />

      <div className="rounded-md border p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Compete</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Meet Day Ops workspace (stub). Meet: <span className="font-mono">{meetId}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/programs/${programId}/meets/ops`}
              className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-muted"
            >
              Change meet
            </Link>
            <Link
              href={`/programs/${programId}/meets/${meetId}`}
              className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-muted"
            >
              Back to meet home
            </Link>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-md border p-4">
            <div className="text-sm font-medium">Stopwatches / Timing</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Stub: group + individual timing surfaces will live here (capability-gated).
            </div>
          </div>

          <div className="rounded-md border p-4">
            <div className="text-sm font-medium">Results Ingestion</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Stub: host-authoritative ingestion (ops tokens lifecycle) will be implemented here.
            </div>
          </div>

          <div className="rounded-md border p-4 md:col-span-2">
            <div className="text-sm font-medium">Live Event States</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Stub: meet_events state monitoring (Option A states) and live feed hooks will be implemented here.
            </div>
          </div>
        </div>

        <div className="mt-6 text-xs text-muted-foreground">
          Locked contract: no heats/flights modeling, attempt-by-attempt scoring tables, or display materialization in v1.2 (deferred).
        </div>
      </div>
    </div>
  );
}
