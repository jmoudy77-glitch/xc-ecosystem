// app/billing/BillingPageClient.tsx
"use client";

import { useEffect, useState } from "react";
import type { PlanCode } from "@/lib/billingPlans";

type RoleHint = "coach" | "athlete" | "both" | "unknown";

type BillingSummary = {
  planCode: PlanCode | null;
  status: string | null;
  currentPeriodEnd: string | null;
};

type ProgramBillingSummary = BillingSummary & {
  programId: string;
  programName: string | null;
};

interface MeResponse {
  auth: {
    id: string;
    email?: string | null;
  };
  user: {
    id: string;
    email: string | null;
    name: string | null;
  };
  roleHint: RoleHint;
  billing: {
    athlete: BillingSummary | null;
    programs: ProgramBillingSummary[];
  };
}

type CheckoutScope = "program" | "athlete";

type UpgradeState = {
  loading: boolean;
  error: string | null;
};

async function fetchMe(): Promise<MeResponse> {
  const res = await fetch("/api/me", { method: "GET" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Failed to load account");
  }
  return res.json();
}

async function createCheckoutSession(params: {
  scope: CheckoutScope;
  ownerId: string;
  planCode: PlanCode;
}) {
  const res = await fetch("/billing/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok || !body.url) {
    throw new Error(body.error || "Failed to create checkout session");
  }

  window.location.href = body.url as string;
}

async function createPortalSession(params: {
  scope: CheckoutScope;
  ownerId: string;
}) {
  const res = await fetch("/billing/create-portal-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok || !body.url) {
    throw new Error(body.error || "Failed to open billing portal");
  }

  window.location.href = body.url as string;
}

export function BillingPageClient() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [athleteUpgrade, setAthleteUpgrade] = useState<UpgradeState>({
    loading: false,
    error: null,
  });

  const [programUpgrade, setProgramUpgrade] = useState<UpgradeState>({
    loading: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchMe();
        if (!cancelled) {
          setMe(data);
        }
      } catch (err: any) {
        console.error("[BillingPageClient] Failed to load /api/me:", err);
        if (!cancelled) {
          setError(err?.message || "Failed to load account");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="p-6">Loading billing…</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold mb-2">Billing</h1>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold mb-2">Billing</h1>
        <p className="text-sm text-gray-600">
          No account information is available.
        </p>
      </div>
    );
  }

  const { user, roleHint, billing } = me;
  const athleteBilling = billing.athlete;
  const programBillings = billing.programs || [];

  const handleAthleteUpgrade = async (planCode: PlanCode) => {
    if (!user?.id) return;
    try {
      setAthleteUpgrade({ loading: true, error: null });
      await createCheckoutSession({
        scope: "athlete",
        ownerId: user.id,
        planCode,
      });
    } catch (err: any) {
      console.error("[BillingPageClient] Athlete upgrade error:", err);
      setAthleteUpgrade({
        loading: false,
        error: err?.message || "Failed to start athlete upgrade",
      });
    }
  };

  const handleProgramUpgrade = async (programId: string, planCode: PlanCode) => {
    try {
      setProgramUpgrade({ loading: true, error: null });
      await createCheckoutSession({
        scope: "program",
        ownerId: programId,
        planCode,
      });
    } catch (err: any) {
      console.error("[BillingPageClient] Program upgrade error:", err);
      setProgramUpgrade({
        loading: false,
        error: err?.message || "Failed to start program upgrade",
      });
    }
  };

  const handleAthletePortal = async () => {
    if (!user?.id) return;
    try {
      setAthleteUpgrade({ loading: true, error: null });
      await createPortalSession({
        scope: "athlete",
        ownerId: user.id,
      });
    } catch (err: any) {
      console.error("[BillingPageClient] Athlete portal error:", err);
      setAthleteUpgrade({
        loading: false,
        error: err?.message || "Failed to open athlete billing portal",
      });
    }
  };

  const handleProgramPortal = async (programId: string) => {
    try {
      setProgramUpgrade({ loading: true, error: null });
      await createPortalSession({
        scope: "program",
        ownerId: programId,
      });
    } catch (err: any) {
      console.error("[BillingPageClient] Program portal error:", err);
      setProgramUpgrade({
        loading: false,
        error: err?.message || "Failed to open program billing portal",
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage subscriptions for your athlete account and any programs you
          belong to.
        </p>
      </header>

      {/* Athlete billing card */}
      {roleHint === "athlete" || roleHint === "both" ? (
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-1">Athlete Subscription</h2>
          <p className="text-xs text-gray-500 mb-3">
            HS Athlete Basic is free; Pro and Elite unlock advanced tools,
            analytics, and recruiting insights.
          </p>

          <div className="flex flex-col gap-2 text-sm">
            <div>
              <span className="font-medium">Current plan: </span>
              <span>
                {athleteBilling?.planCode ?? "None (free or not set)"}
              </span>
            </div>
            <div>
              <span className="font-medium">Status: </span>
              <span>{athleteBilling?.status ?? "n/a"}</span>
            </div>
            <div>
              <span className="font-medium">Renews: </span>
              <span>
                {athleteBilling?.currentPeriodEnd
                  ? new Date(
                      athleteBilling.currentPeriodEnd,
                    ).toLocaleDateString()
                  : "n/a"}
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleAthleteUpgrade("hs_athlete_pro")}
              disabled={athleteUpgrade.loading}
              className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {athleteUpgrade.loading ? "Processing…" : "Upgrade to HS Athlete Pro"}
            </button>
            <button
              type="button"
              onClick={() => handleAthleteUpgrade("hs_athlete_elite")}
              disabled={athleteUpgrade.loading}
              className="inline-flex items-center rounded-md border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-60"
            >
              Upgrade to HS Athlete Elite
            </button>
            {athleteBilling?.planCode && (
              <button
                type="button"
                onClick={handleAthletePortal}
                disabled={athleteUpgrade.loading}
                className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Manage athlete billing
              </button>
            )}
          </div>

          {athleteUpgrade.error && (
            <p className="mt-2 text-xs text-red-600">{athleteUpgrade.error}</p>
          )}
        </section>
      ) : null}

      {/* Program billing card(s) */}
      {(roleHint === "coach" || roleHint === "both") && programBillings.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-1">Program Subscriptions</h2>
          <p className="text-xs text-gray-500 mb-3">
            These subscriptions apply to specific teams/programs under your
            school.
          </p>

          <div className="space-y-4">
            {programBillings.map((pb) => (
              <div
                key={pb.programId}
                className="flex flex-col gap-2 rounded-md border border-gray-100 bg-gray-50 p-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">
                      {pb.programName || "Unnamed program"}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Program ID: {pb.programId}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1 text-xs text-gray-700">
                  <div>
                    <span className="font-medium">Current plan: </span>
                    <span>{pb.planCode ?? "None (free or not set)"}</span>
                  </div>
                  <div>
                    <span className="font-medium">Status: </span>
                    <span>{pb.status ?? "n/a"}</span>
                  </div>
                  <div>
                    <span className="font-medium">Renews: </span>
                    <span>
                      {pb.currentPeriodEnd
                        ? new Date(pb.currentPeriodEnd).toLocaleDateString()
                        : "n/a"}
                    </span>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleProgramUpgrade(pb.programId, "hs_starter")}
                    disabled={programUpgrade.loading}
                    className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {programUpgrade.loading ? "Processing…" : "Upgrade to HS Starter"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleProgramUpgrade(pb.programId, "hs_pro")}
                    disabled={programUpgrade.loading}
                    className="inline-flex items-center rounded-md border border-indigo-600 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-60"
                  >
                    Upgrade to HS Pro
                  </button>
                  <button
                    type="button"
                    onClick={() => handleProgramUpgrade(pb.programId, "hs_elite")}
                    disabled={programUpgrade.loading}
                    className="inline-flex items-center rounded-md border border-yellow-500 px-3 py-1.5 text-xs font-medium text-yellow-700 hover:bg-yellow-50 disabled:opacity-60"
                  >
                    Upgrade to HS Elite
                  </button>
                  {pb.planCode && (
                    <button
                      type="button"
                      onClick={() => handleProgramPortal(pb.programId)}
                      disabled={programUpgrade.loading}
                      className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      Manage program billing
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {programUpgrade.error && (
            <p className="mt-2 text-xs text-red-600">{programUpgrade.error}</p>
          )}
        </section>
      )}

      {(roleHint === "coach" || roleHint === "both") &&
        programBillings.length === 0 && (
          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold mb-1">Program Subscriptions</h2>
            <p className="text-xs text-gray-600">
              You do not currently have any programs attached to your account
              that support billing. Once you create a program for your school,
              its subscription options will appear here.
            </p>
          </section>
        )}
    </div>
  );
}
