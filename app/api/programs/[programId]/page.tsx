// app/programs/[programId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type ProgramSummary = {
  id: string;
  name: string;
  sport: string | null;
  gender: string | null;
  level: string | null;
  season: string | null;
  school: {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    country: string | null;
    level: string | null;
  } | null;
  subscription: {
    planCode: string | null;
    status: string | null;
    currentPeriodEnd: string | null;
  } | null;
};

export default function ProgramOverviewPage() {
  const router = useRouter();
  const params = useParams<{ programId: string }>();
  const programId = params?.programId as string | undefined;

  const [program, setProgram] = useState<ProgramSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!programId) return;

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/programs/${programId}/summary`);
        const body = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(body.error || "Failed to load program");
        }

        if (!cancelled) {
          setProgram(body as ProgramSummary);
        }
      } catch (err: any) {
        console.error("[ProgramOverviewPage] load error:", err);
        if (!cancelled) {
          setErrorMsg(err?.message || "Unexpected error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [programId]);

  if (!programId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="max-w-md bg-white rounded-lg shadow p-6">
          <h1 className="text-lg font-semibold mb-2">Program</h1>
          <p className="text-sm text-slate-600">
            No program ID was provided in the URL.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-600">Loading program…</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="max-w-md bg-white rounded-lg shadow p-6">
          <h1 className="text-lg font-semibold mb-2">Program</h1>
          <p className="text-sm text-red-600 mb-4">{errorMsg}</p>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
          >
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="max-w-md bg-white rounded-lg shadow p-6">
          <h1 className="text-lg font-semibold mb-2">Program</h1>
          <p className="text-sm text-slate-600">
            Program not found. It may have been deleted or you may not have
            access.
          </p>
        </div>
      </div>
    );
  }

  const schoolLocation = program.school
    ? [program.school.city, program.school.state, program.school.country]
        .filter(Boolean)
        .join(", ")
    : "";

  const sub = program.subscription;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <header className="bg-white rounded-xl shadow p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
              Program Overview
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              {program.name}
            </h1>
            {program.school && (
              <p className="mt-1 text-sm text-slate-700">
                {program.school.name}
                {schoolLocation && (
                  <span className="text-slate-500"> · {schoolLocation}</span>
                )}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              {program.sport}
              {program.gender && ` • ${program.gender}`}
              {program.level && ` • ${program.level}`}
              {program.season && ` • ${program.season}`}
            </p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2">
            {sub ? (
              <div className="inline-flex flex-col items-start rounded-lg bg-indigo-50 px-3 py-2">
                <span className="text-xs uppercase tracking-wide text-indigo-700">
                  Subscription
                </span>
                <span className="text-sm font-semibold text-indigo-900">
                  {sub.planCode || "Unknown plan"}
                </span>
                <span className="text-xs text-indigo-800">
                  Status: {sub.status || "n/a"}
                </span>
                {sub.currentPeriodEnd && (
                  <span className="text-xs text-indigo-800">
                    Renews:{" "}
                    {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                No subscription on file yet.
              </p>
            )}

            <button
              type="button"
              onClick={() => router.push("/billing")}
              className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Manage billing
            </button>
          </div>
        </header>

        {/* Layout grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Roster / Recruits quick stats (placeholders for now) */}
          <section className="bg-white rounded-xl shadow p-5 md:col-span-2">
            <h2 className="text-sm font-semibold text-slate-900 mb-2">
              Team Snapshot
            </h2>
            <p className="text-sm text-slate-600 mb-2">
              This will show roster, recruiting board, and scholarship snapshot
              once those modules are wired up.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-lg border border-slate-200 px-3 py-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Roster
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-900">0</p>
                <p className="text-xs text-slate-500">Athletes</p>
              </div>
              <div className="rounded-lg border border-slate-200 px-3 py-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Recruits
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-900">0</p>
                <p className="text-xs text-slate-500">On recruiting board</p>
              </div>
              <div className="rounded-lg border border-slate-200 px-3 py-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Class Focus
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-900">
                  —
                </p>
                <p className="text-xs text-slate-500">
                  Grad year priority (coming soon)
                </p>
              </div>
            </div>
          </section>

          {/* Quick links */}
          <section className="bg-white rounded-xl shadow p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-2">
              Quick Actions
            </h2>
            <div className="flex flex-col gap-2 text-sm">
              <button
                type="button"
                onClick={() => router.push(`/programs/${program.id}/roster`)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-left hover:bg-slate-50"
              >
                View roster (coming soon)
              </button>
              <button
                type="button"
                onClick={() => router.push(`/programs/${program.id}/recruits`)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-left hover:bg-slate-50"
              >
                Open recruiting board (coming soon)
              </button>
              <button
                type="button"
                onClick={() =>
                  router.push(`/programs/${program.id}/pipeline`)
                }
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-left hover:bg-slate-50"
              >
                View pipeline & class planner (coming soon)
              </button>
            </div>
          </section>
        </div>

        {/* Future section for AI & analytics */}
        <section className="bg-white rounded-xl shadow p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-2">
            AI & Analytics (coming soon)
          </h2>
          <p className="text-sm text-slate-600">
            This page will eventually include AI-driven insights such as Scout
            Scores, Commit Probability, and roster/class projections for the
            selected program.
          </p>
        </section>
      </div>
    </div>
  );
}