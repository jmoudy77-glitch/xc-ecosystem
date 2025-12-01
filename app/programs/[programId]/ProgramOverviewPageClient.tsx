// app/programs/[programId]/ProgramOverviewPageClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ProgramSummary = {
  id: string;
  name: string | null;
  sport: string | null;
  gender: string | null;
  level: string | null;
  season: string | null;
  school: {
    id: string;
    name: string | null;
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

export default function ProgramOverviewPageClient({ programId }: { programId: string }) {
  const router = useRouter();
  const [program, setProgram] = useState<ProgramSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/programs/${programId}/summary`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const body = await res.json().catch(() => ({} as any));

        if (!res.ok) {
          const message =
            (body && (body as any).error) ||
            `Failed to load program (status ${res.status})`;
          if (mounted) {
            setError(message);
            setLoading(false);
          }
          return;
        }

        if (mounted) {
          setProgram(body as ProgramSummary);
          setLoading(false);
        }
      } catch (err) {
        console.error("[ProgramOverviewPage] load error:", err);
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unexpected error loading program",
          );
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [programId]);

  if (loading && !program && !error) {
    return (
      <div className="p-6 text-slate-500 text-sm">
        Loading program...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-600 text-sm">
        {error}
      </div>
    );
  }

  if (!program) {
    return (
      <div className="p-6 text-slate-500 text-sm">
        Program not found.
      </div>
    );
  }

  const hasActiveSub =
    program.subscription &&
    (program.subscription.status === "active" ||
      program.subscription.status === "trialing" ||
      program.subscription.status === "past_due");

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Program
            </p>
            <h1 className="text-3xl font-semibold text-slate-900">
              {program.name ?? "Program"}
            </h1>
            {program.school && (
              <p className="mt-1 text-sm text-slate-600">
                {program.school.name}
                {program.school.city && program.school.state
                  ? ` — ${program.school.city}, ${program.school.state}`
                  : ""}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              Sport: {program.sport ?? "N/A"} • Gender: {program.gender ?? "N/A"}
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            {hasActiveSub ? (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
                Subscribed
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 border border-slate-200">
                No active subscription
              </span>
            )}

            <button
              onClick={() => router.push(`/programs/${programId}/billing`)}
              className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
            >
              Manage Billing →
            </button>
          </div>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-800">
            Program overview
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            This area will eventually show roster, recruiting board, AI insights,
            and staff assignments for this program. For now, use the billing
            page to subscribe this program to a plan.
          </p>
        </section>
      </main>
    </div>
  );
}
