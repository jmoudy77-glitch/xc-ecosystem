// app/programs/[programId]/billing/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Subscription = {
  plan_code: string | null;
  status: string | null;
  current_period_end: string | null;
};

type BillingData = {
  programId: string;
  subscription: Subscription | null;
};

function formatStatus(status: string | null | undefined): string {
  if (!status) return "Unknown";
  const s = status.toLowerCase();
  if (s === "active") return "Active";
  if (s === "trialing") return "Trialing";
  if (s === "past_due") return "Past due";
  if (s === "canceled") return "Canceled";
  if (s === "incomplete") return "Incomplete";
  return status;
}

function formatDate(dateIso: string | null | undefined): string {
  if (!dateIso) return "—";
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

export default function ProgramBillingPage() {
  const params = useParams() as { programId?: string | string[] };
  const router = useRouter();

  let programId = "";
  if (typeof params?.programId === "string") {
    programId = params.programId;
  } else if (Array.isArray(params?.programId) && params.programId[0]) {
    programId = params.programId[0];
  }

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [data, setData] = useState<BillingData | null>(null);

  useEffect(() => {
    if (!programId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorMsg(null);

      try {
        const res = await fetch(`/api/programs/${programId}/billing`, {
          credentials: "include",
        });

        const json = await res.json().catch(() => ({}));

        if (res.status === 401) {
          router.push("/login");
          return;
        }

        if (!res.ok) {
          if (!cancelled) {
            setErrorMsg(
              (json && (json.error as string)) ||
                `Failed to load billing (HTTP ${res.status})`,
            );
          }
          return;
        }

        if (!cancelled) {
          setData(json as BillingData);
        }
      } catch (err: any) {
        if (!cancelled) {
          setErrorMsg(err?.message || "Unexpected error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [programId, router]);

  if (!programId) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-semibold">Program Billing</h1>
          <p className="mt-2 text-sm text-slate-400">
            Program ID could not be resolved from the route. Make sure you
            navigate here from the dashboard program list.
          </p>
        </div>
      </div>
    );
  }

  const subscription = data?.subscription ?? null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Program Billing
          </p>
          <h1 className="text-2xl font-semibold text-slate-50">
            Program subscription overview
          </h1>
          <p className="text-xs text-slate-500">
            Program ID:{" "}
            <span className="font-mono text-[11px] text-slate-300">
              {programId}
            </span>
          </p>
        </header>

        {/* Loading / error states */}
        {loading && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
            Loading billing details…
          </div>
        )}

        {errorMsg && !loading && (
          <div className="rounded-xl border border-red-500/40 bg-red-950/60 px-4 py-3 text-sm text-red-100">
            <p className="font-semibold">Unable to load billing</p>
            <p className="mt-1 text-xs text-red-200">{errorMsg}</p>
          </div>
        )}

        {/* Main content */}
        {!loading && !errorMsg && (
          <div className="grid gap-4 md:grid-cols-[1.5fr,1fr]">
            {/* Current plan card */}
            <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Current plan
              </p>

              {subscription ? (
                <div className="mt-3 space-y-2">
                  <p className="text-lg font-semibold text-slate-50">
                    {subscription.plan_code ?? "Unknown plan"}
                  </p>

                  <p className="text-xs text-slate-400">
                    Status:{" "}
                    <span className="font-medium text-slate-100">
                      {formatStatus(subscription.status)}
                    </span>
                  </p>

                  <p className="text-xs text-slate-400">
                    Renews on:{" "}
                    <span className="font-medium text-slate-100">
                      {formatDate(subscription.current_period_end)}
                    </span>
                  </p>

                  <p className="mt-4 text-[11px] text-slate-400">
                    Program plans control coach-seat limits, AI usage, and
                    recruiting tools available to this program. Changes here
                    affect all staff attached to{" "}
                    <span className="font-mono text-[11px]">
                      {programId}
                    </span>
                    .
                  </p>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-semibold text-slate-50">
                    No active subscription
                  </p>
                  <p className="text-xs text-slate-400">
                    This program does not currently have an active paid plan.
                    You can connect a plan using the Stripe portal below.
                  </p>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex items-center rounded-full bg-slate-50 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-white disabled:opacity-60"
                  disabled
                >
                  Upgrade / change plan (coming soon)
                </button>
                <button
                  type="button"
                  className="inline-flex items-center rounded-full border border-slate-600 px-4 py-1.5 text-xs font-medium text-slate-100 hover:border-slate-400 disabled:opacity-60"
                  disabled
                >
                  Open Stripe customer portal (coming soon)
                </button>
              </div>
            </section>

            {/* Plan details / legend */}
            <aside className="space-y-4">
              <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Plan details
                </p>
                {subscription ? (
                  <ul className="mt-3 space-y-1 text-[11px] text-slate-300">
                    <li>
                      • Plan code:{" "}
                      <span className="font-mono">
                        {subscription.plan_code ?? "—"}
                      </span>
                    </li>
                    <li>• Status: {formatStatus(subscription.status)}</li>
                    <li>
                      • Next renewal:{" "}
                      {formatDate(subscription.current_period_end)}
                    </li>
                  </ul>
                ) : (
                  <p className="mt-3 text-[11px] text-slate-300">
                    Once this program has an active plan, details about renewal
                    and status will appear here.
                  </p>
                )}
              </section>

              <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Coming soon
                </p>
                <ul className="mt-2 space-y-1 text-[11px] text-slate-300">
                  <li>• One-click plan upgrades and downgrades</li>
                  <li>• Seat limits & staff usage overview</li>
                  <li>• AI credits and usage meters</li>
                  <li>• Billing history and invoices</li>
                </ul>
              </section>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
