/* File: app/programs/[programId]/meets/review/page.tsx */
import Link from "next/link";
import { WorkflowHeader } from "@/app/components/meet_manager/WorkflowHeader";

type PageProps = {
  params: Promise<{ programId: string }>;
};

export default async function MeetsReviewLandingPage({ params }: PageProps) {
  const { programId } = await params;

  return (
    <div className="px-6 py-6">
      <WorkflowHeader programId={programId} current="review" />

      <div className="mt-4 rounded-md border p-4">
        <h1 className="text-lg font-semibold">Review</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a meet to review results and participation.
        </p>

        <div className="mt-4">
          <Link
            href={`/programs/${programId}/meets`}
            className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm hover:bg-muted"
          >
            Go to Meets
          </Link>
        </div>
      </div>
    </div>
  );
}
