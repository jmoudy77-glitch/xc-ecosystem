/* File: app/programs/[programId]/meets/page.tsx */

import Link from "next/link";
import { getMeetHome } from "@/app/actions/meet_manager/getMeetHome";

type PageProps = {
  params: Promise<{ programId: string }>;
};

export default async function ProgramMeetsPage({ params }: PageProps) {
  const { programId } = await params;

  // Read-only stub: grounded on locked schema + minimal read server action.
  // Do not assume return shape; render a stable triage surface with safe fallbacks.
  let data: any = null;
  let error: string | null = null;

  try {
    data = await getMeetHome(programId);
  } catch (e: any) {
    error = e?.message ?? "Failed to load meets.";
  }

  const meets: any[] = Array.isArray(data?.meets) ? data.meets : [];

  return (
    <div className="px-6 py-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Meet Manager</h1>
          <p className="text-sm text-muted-foreground">
            Create or join meets, monitor alerts, and review archived meets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/programs/${programId}/meets?mode=create`}
            className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-muted"
          >
            Create meet
          </Link>
          <Link
            href={`/programs/${programId}/meets?mode=join`}
            className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-muted"
          >
            Join meet
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border bg-muted/30 p-4 text-sm">
          <div className="font-medium">Unable to load meet data</div>
          <div className="mt-1 text-muted-foreground">{error}</div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-md border p-4">
          <div className="mb-2 text-sm font-medium">Active meets</div>
          {meets.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No meets yet. Use Create or Join to get started.
            </div>
          ) : (
            <ul className="space-y-2">
              {meets.slice(0, 10).map((m: any) => {
                const meetId = m?.id ?? m?.meet_id;
                const title = m?.name ?? m?.title ?? "Meet";
                const state = m?.lifecycle_state ?? m?.state ?? "unknown";

                if (!meetId) return null;

                return (
                  <li key={String(meetId)} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{title}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          State: {String(state)}
                        </div>
                      </div>
                      <Link
                        href={`/programs/${programId}/meets/${meetId}`}
                        className="text-sm underline underline-offset-4"
                      >
                        Open
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-md border p-4">
          <div className="mb-2 text-sm font-medium">Alerts / To-dos</div>
          <div className="text-sm text-muted-foreground">
            Stub: alert panels will populate from ops + results lifecycle after validation.
          </div>

          <div className="mt-4 border-t pt-4">
            <div className="mb-2 text-sm font-medium">Review</div>
            <div className="text-sm text-muted-foreground">
              Stub: archived meets and results review will appear here once results ingestion is wired.
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 text-xs text-muted-foreground">
        Read-only stub. No meet mutation actions are implemented on this surface.
      </div>
    </div>
  );
}
