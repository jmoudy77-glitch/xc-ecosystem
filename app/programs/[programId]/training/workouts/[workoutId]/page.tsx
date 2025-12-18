// app/programs/[programId]/training/workouts/[workoutId]/page.tsx

import WorkoutDetailClient from "./WorkoutDetailClient";

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ programId: string; workoutId: string }>;
}) {
  const { programId, workoutId } = await params;

  return (
    <div className="space-y-4">
      <WorkoutDetailClient programId={programId} workoutId={workoutId} />
    </div>
  );
}