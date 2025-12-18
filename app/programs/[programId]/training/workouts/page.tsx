// app/programs/[programId]/training/workouts/page.tsx
import Link from "next/link";
import WorkoutsClient from "./WorkoutsClient";

export default async function WorkoutsPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-[var(--muted-foreground)]">Training</div>
          <h1 className="text-xl font-semibold text-[var(--foreground)]">Workout Library</h1>
          <div className="text-sm text-[var(--muted-foreground)]">
            Build reusable workouts from your exercise catalog.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/programs/${programId}/training`}
            className="inline-flex items-center rounded-md ring-1 ring-panel bg-panel-muted px-3 py-2 text-sm text-[var(--foreground)] hover:bg-panel"
          >
            Back to Training
          </Link>
        </div>
      </div>

      {/* Client */}
      <WorkoutsClient programId={programId} />
    </div>
  );
}