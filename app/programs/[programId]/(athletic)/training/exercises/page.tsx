// app/programs/[programId]/training/exercises/page.tsx
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import ExercisesClient from "./ExercisesClient";

export default function ProgramTrainingExercisesPage() {
  const params = useParams<{ programId: string }>();
  const programId = params?.programId;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex items-center gap-1 text-[11px] text-[var(--muted-foreground)]">
          <Link href={`/programs/${programId}`} className="hover:underline">
            Program
          </Link>
          <span>/</span>
          <Link href={`/programs/${programId}/training`} className="hover:underline">
            Training
          </Link>
          <span>/</span>
          <span className="font-medium text-[var(--foreground)]">Exercises</span>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={programId ? `/programs/${programId}/training` : "#"}
            className="inline-flex items-center rounded-full ring-1 ring-panel bg-panel-muted px-3 py-1.5 text-[11px] font-medium text-[var(--foreground)] hover:bg-panel"
          >
            Back to training
          </Link>
        </div>
      </div>

      <section className="rounded-xl ring-1 ring-panel panel p-5">
        {programId ? (
          <ExercisesClient programId={programId} />
        ) : (
          <div className="rounded-lg ring-1 ring-panel panel-muted p-4 text-[11px] text-[var(--muted-foreground)]">
            Missing program context.
          </div>
        )}
      </section>
    </div>
  );
}