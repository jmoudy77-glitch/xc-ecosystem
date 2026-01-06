/* File: app/programs/[programId]/meets/[meetId]/review/page.tsx */
import Link from "next/link";
import { WorkflowHeader } from "@/app/components/meet_manager/WorkflowHeader";

type PageProps = {
  params: Promise<{ programId: string; meetId: string }>;
};

export default async function MeetReviewWorkspacePage({ params }: PageProps) {
  const { programId, meetId } = await params;

  return (
    <div className="px-6 py-6">
      <WorkflowHeader programId={programId} current="review" />

      <div className="rounded-md border p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Review</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Results & archive workspace (stub). Meet: <span className="font-mono">{meetId}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/programs/${programId}/meets/review`}
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
            <div className="text-sm font-medium">Published Results</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Stub: published-safe results will render from public views (latest revision; published/final/revised only).
            </div>
          </div>

          <div className="rounded-md border p-4">
            <div className="text-sm font-medium">Revisions</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Stub: host participants may review revision history (visibility gated by RLS and publication state).
            </div>
          </div>

          <div className="rounded-md border p-4 md:col-span-2">
            <div className="text-sm font-medium">Archive</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Stub: meet notes, summaries, and archival artifacts will appear here (core spine only in v1.2).
            </div>
          </div>
        </div>

        <div className="mt-6 text-xs text-muted-foreground">
          Locked contract: Review does not introduce scoring abstractions, display materialization, or attempt-by-attempt detail tables in v1.2 (deferred).
        </div>
      </div>
    </div>
  );
}
