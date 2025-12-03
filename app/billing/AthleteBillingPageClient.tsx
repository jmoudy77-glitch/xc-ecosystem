// app/billing/AthleteBillingPageClient.tsx
"use client";

import { useState } from "react";

type AthleteSubscription = {
  planCode: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
} | null;

type Props = {
  userId: string;
  email: string | null;
  subscription: AthleteSubscription;
};

type BillingState = "idle" | "starting_checkout" | "opening_portal";

const ATHLETE_PLANS = [
  {
    code: "hs_athlete_basic",
    name: "Athlete Basic",
    priceLabel: "$9 / month",
    blurb: "Core tools for tracking workouts, progress, and PRs.",
  },
  {
    code: "hs_athlete_pro",
    name: "Athlete Pro",
    priceLabel: "$19 / month",
    blurb: "Advanced analytics, training insights, and season planning.",
  },
  {
    code: "hs_athlete_elite",
    name: "Athlete Elite",
    priceLabel: "$29 / month",
    blurb: "Full AI assistance, projections, and recruiting tools.",
  },
] as const;

const PLAN_LABELS: Record<string, string> = {
  hs_athlete_basic: "Athlete Basic",
  hs_athlete_pro: "Athlete Pro",
  hs_athlete_elite: "Athlete Elite",
};

function formatRenewal(dateIso: string | null | undefined): string | null {
  if (!dateIso) return null;
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AthleteBillingPageClient({
  userId,
  email,
  subscription,
}: Props) {
  const [billingState, setBillingState] = useState<BillingState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(planCode: string) {
    try {
      setBillingState("starting_checkout");
      setError(null);

      const res = await fetch("/billing/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scope: "athlete",
          ownerId: userId,
          planCode,
        }),
      });

      const body = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        const message =
          (body && (body as any).error) ||
          `Failed to start checkout (status ${res.status})`;
        setError(message);
        setBillingState("idle");
        return;
      }

      const url = (body as any).url as string | undefined;
      if (!url) {
        setError("No checkout URL returned from server.");
        setBillingState("idle");
        return;
      }

      window.location.href = url;
    } catch (err: unknown) {
      console.error("[AthleteBillingPage] startCheckout error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unexpected error starting checkout",
      );
      setBillingState("idle");
    }
  }

  async function openPortal() {
    try {
      setBillingState("opening_portal");
      setError(null);

      const res = await fetch("/billing/create-portal-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scope: "athlete",
          ownerId: userId,
        }),
      });

      const body = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        const message =
          (body && (body as any).error) ||
          `Failed to open billing portal (status ${res.status})`;
        setError(message);
        setBillingState("idle");
        return;
      }

      const url = (body as any).url as string | undefined;
      if (!url) {
        setError("No portal URL returned from server.");
        setBillingState("idle");
        return;
      }

      window.location.href = url;
    } catch (err: unknown) {
      console.error("[AthleteBillingPage] openPortal error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unexpected error opening billing portal",
      );
      setBillingState("idle");
    }
  }

    const status = subscription?.status ?? "unknown";

  const hasActiveSub: boolean =
    !!subscription &&
    (subscription.status === "active" ||
      subscription.status === "trialing" ||
      subscription.status === "past_due");

  const currentPlanLabel = subscription?.planCode
    ? PLAN_LABELS[subscription.planCode] || subscription.planCode
    : null;

  const renewalLabel = formatRenewal(subscription?.currentPeriodEnd ?? null);

  const isBusy: boolean =
    billingState === "starting_checkout" ||
    billingState === "opening_portal";

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-3xl px-4 py-8">
        <header className="mb-6 space-y-2">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Athlete Billing
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">
            Your athlete subscription
          </h1>
          {email && (
            <p className="text-sm text-slate-600">
              Signed in as{" "}
              <span className="font-mono text-xs text-slate-800">{email}</span>
            </p>
          )}

          <div className="mt-3 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            {hasActiveSub ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                <p className="font-medium">
                  Current plan:{" "}
                  {currentPlanLabel ? currentPlanLabel : "Active subscription"}
                </p>
                {renewalLabel && (
                  <p className="mt-0.5">
                    Renews on{" "}
                    <span className="font-medium">{renewalLabel}</span>
                  </p>
                )}
                <p className="mt-0.5">
                  Status: <span className="font-medium">{status}</span>
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                <p className="font-medium">No active athlete subscription</p>
                <p className="mt-0.5">
                  Choose a plan below to unlock personal tools, insights, and
                  recruiting features.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={openPortal}
              disabled={billingState === "opening_portal"}
              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
            >
              {billingState === "opening_portal"
                ? "Opening billing portal…"
                : "Open billing portal"}
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <section className="mt-4">
          <h2 className="text-sm font-semibold text-slate-800">
            Athlete plans
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Choose the plan that best fits how you train and compete. You can
            change or cancel anytime from the billing portal.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {ATHLETE_PLANS.map((plan) => {
                const isCurrent: boolean =
                    hasActiveSub && subscription?.planCode === plan.code;

                return (
                    <article
                    key={plan.code}
                    className={`flex flex-col rounded-xl border bg-white p-4 shadow-sm ${
                        isCurrent
                        ? "border-emerald-300 ring-1 ring-emerald-200"
                        : "border-slate-200"
                    }`}
                    >
                    {/* ... */}

                    <button
                        type="button"
                        disabled={isBusy || isCurrent}
                        onClick={() => startCheckout(plan.code)}
                        className={`mt-4 inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium ${
                        isCurrent
                            ? "border border-slate-200 bg-slate-100 text-slate-500"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        } disabled:opacity-60`}
                    >
                        {isCurrent ? "Current plan" : "Select plan"}
                    </button>
                    </article>
                );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}