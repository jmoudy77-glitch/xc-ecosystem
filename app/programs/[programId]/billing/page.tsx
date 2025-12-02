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

const PROGRAM_PLAN_OPTIONS = [
  {
    code: "college_starter",
    label: "College Starter",
    blurb: "Core tools for small college programs.",
  },
  {
    code: "college_pro",
    label: "College Pro",
    blurb: "Advanced analytics and recruiting boards.",
  },
  {
    code: "college_elite",
    label: "College Elite",
    blurb: "Full AI scouting, projections, and multi-program support.",
  },
];

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

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [selectedPlanCode, setSelectedPlanCode] = useState<string>(
    PROGRAM_PLAN_OPTIONS[0]?.code ?? "college_starter"
  );

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
          const payload = json as BillingData;
          setData(payload);

          // Initialize selected plan from current subscription if present
          if (payload.subscription?.plan_code) {
            setSelectedPlanCode(payload.subscription.plan_code);
          }
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

  async function handleCheckout() {
    if (!programId || !selectedPlanCode) return;

    setCheckoutLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/billing/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scope: "org",
          ownerId: programId,
          planCode: selectedPlanCode,
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMsg(
          (body && (body.error as string)) ||
            `Failed to start checkout (HTTP ${res.status})`,
        );
        return;
      }

      const url = (body && (body.url as string)) || "";
      if (url) {
        window.location.href = url;
      } else {
        setErrorMsg("Checkout session created but no redirect URL returned.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Unexpected error starting checkout");
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function handlePortal() {
    if (!programId) return;

    setPortalLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/billing/create-portal-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scope: "org",
          ownerId: programId,
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMsg(
          (body && (body.error as string)) ||
            `Failed to open portal (HTTP ${res.status})`,
        );
        return;
      }

      const url = (body && (body.url as string)) || "";
      if (url) {
        window.location.href = url;
      } else {
        setErrorMsg("Portal session created but no redirect URL returned.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Unexpected error opening portal");
    } finally {
      setPortalLoading(false);
    }
  }

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
  const currentPlanCode = subscription?.plan_code ?? null;

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
            <p className="font-semibold">Unable to manage billing</p>
            <p className="mt-1 text-xs text-red-200">{errorMsg}</p>
          </div>
        )}

        {/* Main content */}
        {!loading && (
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
                    affect all staff attached to this program.
                  </p>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-semibold text-slate-50">
                    No active subscription
                  </p>
                  <p className="text-xs text-slate-400">
                    This program does not currently have an active paid plan.
                    Choose a plan on the right and continue to Stripe checkout
                    to activate one.
                  </p>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleCheckout()}
                  disabled={checkoutLoading}
                  className="inline-flex items-center rounded-full bg-slate-50 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-white disabled:opacity-60"
                >
                  {checkoutLoading
                    ? "Redirecting to checkout…"
                    : currentPlanCode
                    ? "Change plan in Stripe"
                    : "Activate plan in Stripe"}
                </button>
                <button
                  type="button"
                  onClick={() => void handlePortal()}
                  disabled={portalLoading}
                  className="inline-flex items-center rounded-full border border-slate-600 px-4 py-1.5 text-xs font-medium text-slate-100 hover:border-slate-400 disabled:opacity-60"
                >
                  {portalLoading
                    ? "Opening portal…"
                    : "Open Stripe customer portal"}
                </button>
              </div>
            </section>

            {/* Plan selection / legend */}
            <aside className="space-y-4">
              <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Choose a program plan
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Select the plan you want to manage or upgrade to. The button
                  on the left will send you to Stripe checkout or your existing
                  subscription.
                </p>

                <div className="mt-3 space-y-2">
                  {PROGRAM_PLAN_OPTIONS.map((plan) => {
                    const isCurrent = currentPlanCode === plan.code;
                    const isSelected = selectedPlanCode === plan.code;
                    return (
                      <button
                        key={plan.code}
                        type="button"
                        onClick={() => setSelectedPlanCode(plan.code)}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-[11px] transition ${
                          isSelected
                            ? "border-slate-50 bg-slate-50/10"
                            : "border-slate-800 bg-slate-950/40 hover:border-slate-500"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-50">
                            {plan.label}
                          </span>
                          {isCurrent && (
                            <span className="rounded-full border border-emerald-400/60 bg-emerald-500/10 px-2 py-[2px] text-[10px] font-medium text-emerald-200">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {plan.blurb}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Coming soon
                </p>
                <ul className="mt-2 space-y-1 text-[11px] text-slate-300">
                  <li>• Seat limits & staff usage overview</li>
                  <li>• AI credits and usage meters</li>
                  <li>• Billing history and invoices</li>
                  <li>• Program-level add-ons and bundles</li>
                </ul>
              </section>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
