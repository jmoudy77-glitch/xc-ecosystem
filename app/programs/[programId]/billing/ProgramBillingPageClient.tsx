// app/programs/[programId]/billing/ProgramBillingPageClient.tsx
"use client";

import { useEffect, useState } from "react";

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

type Props = {
  programId: string;
};

type BillingState =
  | "idle"
  | "loading_program"
  | "starting_checkout"
  | "opening_portal";

const HS_PROGRAM_PLANS = [
  {
    code: "hs_starter",
    name: "HS Starter",
    priceLabel: "$39 / month",
    blurb: "Core tools for a single high school program.",
  },
  {
    code: "hs_pro",
    name: "HS Pro",
    priceLabel: "$79 / month",
    blurb: "Advanced reporting, tags, and recruiting workflows.",
  },
  {
    code: "hs_elite",
    name: "HS Elite",
    priceLabel: "$129 / month",
    blurb: "Multi-program coordination, advanced analytics, and AI tools.",
  },
] as const;

const COLLEGE_PROGRAM_PLANS = [
  {
    code: "college_starter",
    name: "College Starter",
    priceLabel: "$59 / month",
    blurb: "Foundational tools for small college programs.",
  },
  {
    code: "college_pro",
    name: "College Pro",
    priceLabel: "$119 / month",
    blurb: "Deeper analytics, board views, and class planning tools.",
  },
  {
    code: "college_elite",
    name: "College Elite",
    priceLabel: "$199 / month",
    blurb: "Full AI assistant, projections, and multi-program support.",
  },
] as const;

const PLAN_LABELS: Record<string, string> = {
  hs_starter: "HS Starter",
  hs_pro: "HS Pro",
  hs_elite: "HS Elite",
  college_starter: "College Starter",
  college_pro: "College Pro",
  college_elite: "College Elite",
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

export default function ProgramBillingPageClient({ programId }: Props) {
  const [program, setProgram] = useState<ProgramSummary | null>(null);
  const [billingState, setBillingState] = useState<BillingState>("loading_program");
  const [error, setError] = useState<string | null>(null);

  // Load program summary
  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setBillingState("loading_program");
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
          if (!isMounted) return;
          setError(message);
          setBillingState("idle");
          return;
        }

        if (!isMounted) return;
        setProgram(body as ProgramSummary);
        setBillingState("idle");
      } catch (err: unknown) {
        console.error("[ProgramBillingPage] load error:", err);
        if (!isMounted) return;
        setError(
          err instanceof Error
            ? err.message
            : "Unexpected error loading program",
        );
        setBillingState("idle");
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, [programId]);

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
          scope: "program",
          ownerId: programId,
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
      console.error("[ProgramBillingPage] startCheckout error:", err);
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
          scope: "program",
          ownerId: programId,
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
      console.error("[ProgramBillingPage] openPortal error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unexpected error opening billing portal",
      );
      setBillingState("idle");
    }
  }

  const isLoadingProgram = billingState === "loading_program";

  const isHighSchoolProgram =
    program?.level === "hs" ||
    program?.level === "high_school" ||
    program?.level === "highschool";

  const planSet = isHighSchoolProgram ? HS_PROGRAM_PLANS : COLLEGE_PROGRAM_PLANS;

  const hasActiveSub =
    program?.subscription &&
    (program.subscription.status === "active" ||
      program.subscription.status === "trialing" ||
      program.subscription.status === "past_due");

  const currentPlanLabel = program?.subscription?.planCode
    ? PLAN_LABELS[program.subscription.planCode] ||
      program.subscription.planCode
    : null;

  const renewalLabel = formatRenewal(
    program?.subscription?.currentPeriodEnd ?? null,
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Billing
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              {program?.name ? program.name : "Program billing"}
            </h1>
            {program?.school && (
              <p className="mt-1 text-sm text-slate-600">
                {program.school.name}
                {program.school.city && program.school.state
                  ? ` — ${program.school.city}, ${program.school.state}`
                  : ""}
              </p>
            )}
            {isLoadingProgram && (
              <p className="mt-1 text-xs text-slate-500">
                Loading program details…
              </p>
            )}
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            {hasActiveSub ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                <p className="font-medium">
                  Current plan:{" "}
                  {currentPlanLabel ? currentPlanLabel : "Active subscription"}
                </p>
                {renewalLabel && (
                  <p className="mt-0.5">
                    Renews on <span className="font-medium">{renewalLabel}</span>
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                <p className="font-medium">No active subscription</p>
                <p className="mt-0.5">
                  Select a plan below to get started with TrackStar for this
                  program.
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
            {isHighSchoolProgram ? "High school program plans" : "College program plans"}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Choose a subscription for this specific program. You can change or
            cancel your plan anytime from the billing portal.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {planSet.map((plan) => {
              const isCurrent =
                hasActiveSub &&
                program?.subscription?.planCode === plan.code;

              const isBusy =
                billingState === "starting_checkout" ||
                billingState === "opening_portal";

              return (
                <article
                  key={plan.code}
                  className={`flex flex-col rounded-xl border bg-white p-4 shadow-sm ${
                    isCurrent
                      ? "border-emerald-300 ring-1 ring-emerald-200"
                      : "border-slate-200"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {plan.name}
                    </h3>
                    {isCurrent && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-semibold text-slate-900">
                    {plan.priceLabel}
                  </p>
                  <p className="mt-1 flex-1 text-xs text-slate-600">
                    {plan.blurb}
                  </p>

                  <button
                    type="button"
                    disabled={!!(isBusy || isCurrent)}
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
