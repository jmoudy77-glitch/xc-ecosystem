// app/programs/[programId]/billing/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { PlanCode } from "@/lib/billingPlans";

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

type BillingState = "idle" | "checking_out" | "opening_portal";

type ProgramPlan = {
  code: PlanCode;
  label: string;
  priceHint: string;
  description: string;
  recommended?: boolean;
};

const HS_PLANS: ProgramPlan[] = [
  {
    code: "hs_starter",
    label: "HS Starter",
    priceHint: "$29 / month (example)",
    description:
      "Core tools for a single HS program: roster, basic board, and simple reports.",
    recommended: true,
  },
  {
    code: "hs_pro",
    label: "HS Pro",
    priceHint: "$59 / month (example)",
    description:
      "Adds deeper recruiting boards, simple pipeline views, and basic AI suggestions.",
  },
  {
    code: "hs_elite",
    label: "HS Elite",
    priceHint: "$99 / month (example)",
    description:
      "Full recruiting CRM, advanced pipeline, and all AI modules for one HS program.",
  },
];

const COLLEGE_PLANS: ProgramPlan[] = [
  {
    code: "college_starter",
    label: "College Starter",
    priceHint: "$79 / month (example)",
    description: "Core roster + recruiting tools for a college program.",
    recommended: true,
  },
  {
    code: "college_pro",
    label: "College Pro",
    priceHint: "$149 / month (example)",
    description:
      "Adds recruiting analytics, simple pipeline, and AI-assisted prioritization.",
  },
  {
    code: "college_elite",
    label: "College Elite",
    priceHint: "$249 / month (example)",
    description:
      "Everything unlocked: advanced AI, class planning, and multi-year projections.",
  },
];

export default function ProgramBillingPage() {
  const params = useParams<{ programId: string }>();
  const programId = params?.programId as string | undefined;

  const [program, setProgram] = useState<ProgramSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [billingState, setBillingState] = useState<BillingState>("idle");

  useEffect(() => {
    if (!programId) return;

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const res = await fetch(`/api/programs/${programId}/summary`);
        const body = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(body.error || "Failed to load program");
        }

        if (!cancelled) {
          setProgram(body as ProgramSummary);
        }
      } catch (err: any) {
        console.error("[ProgramBillingPage] load error:", err);
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

  async function startCheckout(planCode: PlanCode) {
    if (!programId) return;

    try {
      setBillingState("checking_out");
      setErrorMsg(null);

      const res = await fetch("/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "program",
          ownerId: programId,
          planCode,
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.error || "Failed to start checkout");
      }

      if (!body.url) {
        throw new Error("Checkout URL was not returned from the server");
      }

      window.location.href = body.url as string;
    } catch (err: any) {
      console.error("[ProgramBillingPage] checkout error:", err);
      setErrorMsg(err?.message || "Failed to start checkout");
      setBillingState("idle");
    }
  }

  async function openPortal() {
    if (!programId) return;

    try {
      setBillingState("opening_portal");
      setErrorMsg(null);

      const res = await fetch("/billing/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "program",
          ownerId: programId,
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.error || "Failed to open billing portal");
      }

      if (!body.url) {
        throw new Error("Portal URL was not returned from the server");
      }

      window.location.href = body.url as string;
    } catch (err: any) {
      console.error("[ProgramBillingPage] portal error:", err);
      setErrorMsg(err?.message || "Failed to open billing portal");
      setBillingState("idle");
    }
  }

  if (!programId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="max-w-md bg-white rounded-lg shadow p-6">
          <h1 className="text-lg font-semibold mb-2">Program Billing</h1>
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
        <p className="text-sm text-slate-600">Loading program billing…</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="max-w-md bg-white rounded-lg shadow p-6">
          <h1 className="text-lg font-semibold mb-2">Program Billing</h1>
          <p className="text-sm text-red-600 mb-4">{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="max-w-md bg-white rounded-lg shadow p-6">
          <h1 className="text-lg font-semibold mb-2">Program Billing</h1>
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

  // Decide which plan set to emphasize
  const schoolLevel = program.school?.level ?? "";
  const showHSFirst = schoolLevel.toLowerCase() === "hs";
  const primaryPlans = showHSFirst ? HS_PLANS : COLLEGE_PLANS;
  const secondaryPlans = showHSFirst ? COLLEGE_PLANS : HS_PLANS;
  const secondaryLabel = showHSFirst ? "College Plans" : "High School Plans";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <header className="bg-white rounded-xl shadow p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
              Program Billing
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
              <div className="inline-flex flex-col items-start rounded-lg bg-indigo-50 px-3 py-2 text-xs">
                <span className="uppercase tracking-wide text-indigo-700">
                  Current Plan
                </span>
                <span className="text-sm font-semibold text-indigo-900">
                  {sub.planCode || "Unknown plan"}
                </span>
                <span className="text-indigo-800">
                  Status: {sub.status || "n/a"}
                </span>
                {sub.currentPeriodEnd && (
                  <span className="text-indigo-800">
                    Renews:{" "}
                    {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                No active subscription. Select a plan below to get started.
              </p>
            )}

            <button
                type="button"
                onClick={openPortal}
                disabled={billingState === "opening_portal" ? true : false}
                className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                {billingState === "opening_portal"
                    ? "Opening portal…"
                    : "Open billing portal"}
            </button>
          </div>
        </header>

        {/* Primary plan set */}
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">
            Choose a plan for this program
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Plans below are tailored to your program type. Pricing is shown as
            example copy; Stripe controls the real amounts.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {primaryPlans.map((plan) => {
              const isCurrent =
                sub && sub.planCode && sub.planCode === plan.code;

              return (
                <div
                  key={plan.code}
                  className={`flex flex-col rounded-lg border p-4 text-sm ${
                    plan.recommended
                      ? "border-blue-500 shadow-sm"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-slate-900">
                      {plan.label}
                    </h3>
                    {plan.recommended && (
                      <span className="text-[10px] uppercase tracking-wide bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mb-2">
                    {plan.priceHint}
                  </p>
                  <p className="text-xs text-slate-600 flex-1 mb-3">
                    {plan.description}
                  </p>
                  <button
                    type="button"
                    disabled={
                        billingState !== "idle" ||
                        Boolean(isCurrent && sub?.status)
                    }
                    onClick={() => startCheckout(plan.code)}
                    className={`mt-auto rounded-md px-3 py-2 text-xs font-medium ${
                        isCurrent
                        ? "bg-green-50 text-green-700 border border-green-200 cursor-default"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    } disabled:opacity-60`}
                    >
                    {isCurrent ? "Current plan" : "Select plan"}
                    </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Secondary plan set */}
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">
            {secondaryLabel} (optional)
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            These plans are shown for flexibility or testing across HS/college
            tiers. In production, you might hide this group based on school
            level.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {secondaryPlans.map((plan) => {
              const isCurrent =
                sub && sub.planCode && sub.planCode === plan.code;

              return (
                <div
                  key={plan.code}
                  className="flex flex-col rounded-lg border border-slate-200 p-4 text-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-slate-900">
                      {plan.label}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">
                    {plan.priceHint}
                  </p>
                  <p className="text-xs text-slate-600 flex-1 mb-3">
                    {plan.description}
                  </p>
                  <button
                    type="button"
                    disabled={
                        billingState !== "idle" ||
                        Boolean(isCurrent && sub?.status)
                    }
                    onClick={() => startCheckout(plan.code)}
                    className={`mt-auto rounded-md px-3 py-2 text-xs font-medium ${
                        isCurrent
                        ? "bg-green-50 text-green-700 border border-green-200 cursor-default"
                        : "bg-slate-800 text-white hover:bg-slate-900"
                    } disabled:opacity-60`}
                    >
                    {isCurrent ? "Current plan" : "Select plan"}
                    </button>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}