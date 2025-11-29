// app/billing/BillingPageClient.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import type { PlanCode } from "@/lib/billingPlans";

type BillingScope = "org" | "athlete" | "none";

interface MeResponse {
  user: {
    id: string;
    email: string;
    role: "coach" | "athlete";
    orgId: string | null;
    athleteId: string | null;
  };
  billingScope: BillingScope;
  org: {
    id: string;
    name: string;
    subscriptionTier: string | null;
  } | null;
  athlete: {
    id: string;
    name: string;
    subscriptionTier: string | null;
  } | null;
  tiers: {
    athlete: string | null;
    org: string | null;
  };
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function BillingPageClient() {
  const [data, setData] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        // 1) Get current Supabase session on the client
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw new Error("Failed to get Supabase session");
        }

        if (!session) {
          throw new Error("Not authenticated");
        }

        const token = session.access_token;

        // 2) Call /api/me with Authorization header
        const res = await fetch("/api/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(
            `Failed to load account info (${res.status} ${res.statusText}): ${text}`
          );
        }

        const json = (await res.json()) as MeResponse;
        if (isMounted) {
          setData(json);
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Unexpected error loading account";
        console.error("Error loading /api/me:", message);
        if (isMounted) {
          setError(message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleUpgradeToElite = async () => {
    if (!data) return;

    setUpgradeError(null);
    setUpgradeLoading(true);

    try {
      const scope = data.billingScope;

      if (scope === "none") {
        setUpgradeError(
          "No billable scope found yet. You may need to be attached to an org or athlete profile first."
        );
        return;
      }

      // 🔑 Decide ownerId based on scope
      let ownerId: string | null = null;

      if (scope === "athlete") {
        // If you’re using athleteId as owner in the DB, prefer that
        ownerId = data.user.athleteId ?? data.user.id;
      } else if (scope === "org") {
        ownerId = data.user.orgId;
      }

      if (!ownerId) {
        setUpgradeError(
          "Could not determine owner for billing (missing orgId/athleteId)."
        );
        return;
      }

      // 🔑 Pick the correct PlanCode for "Elite"
      // Adjust this if you have different org elite tiers (HS vs College)
      let planCode: PlanCode;

      if (scope === "athlete") {
        planCode = "hs_athlete_elite";
      } else {
        // Example: default to HS Elite for orgs
        planCode = "hs_elite";
        // or, if you want college orgs: planCode = "college_elite";
      }

      const res = await fetch("/billing/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scope,
          ownerId,
          planCode,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Checkout session error:", text);
        throw new Error("Failed to create checkout session");
      }

      const json = await res.json();
      if (!json.url) {
        throw new Error("No checkout URL returned from server");
      }

      window.location.href = json.url;
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Unexpected error starting upgrade";
      console.error("Error upgrading to Elite:", message);
      setUpgradeError(message);
    } finally {
      setUpgradeLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-sm text-gray-500">Loading billing info…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <div className="font-semibold mb-1">Failed to load billing info</div>
        <code className="text-xs block mt-1 whitespace-pre-wrap">{error}</code>
      </div>
    );
  }

  if (!data) {
    return <div>No account info found.</div>;
  }

  const { user, billingScope, org, athlete, tiers } = data;

  const currentOrgPlan = tiers.org;
  const currentAthletePlan = tiers.athlete;

  const activePlan =
    billingScope === "org"
      ? currentOrgPlan
      : billingScope === "athlete"
      ? currentAthletePlan
      : null;

  const isElite =
    typeof activePlan === "string" &&
    activePlan.toLowerCase().includes("elite");

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-sm text-gray-500 mt-1">
          View your current plan and upgrade to Elite.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 shadow-sm">
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500">
            Account
          </div>
          <div className="font-medium text-sm">{user.email}</div>
          <div className="text-xs text-gray-500">
            Role: {user.role} • Billing scope: {billingScope}
          </div>
        </div>

        {billingScope === "org" && org && (
          <div className="pt-2 border-t border-gray-100">
            <div className="text-xs uppercase tracking-wide text-gray-500">
              Organization
            </div>
            <div className="font-medium text-sm">{org.name}</div>
            <div className="text-xs text-gray-500">
              Current plan: {currentOrgPlan ?? "None"}
            </div>
          </div>
        )}

        {billingScope === "athlete" && athlete && (
          <div className="pt-2 border-t border-gray-100">
            <div className="text-xs uppercase tracking-wide text-gray-500">
              Athlete
            </div>
            <div className="font-medium text-sm">{athlete.name}</div>
            <div className="text-xs text-gray-500">
              Current plan: {currentAthletePlan ?? "HS ATHLETE BASIC"}
            </div>
          </div>
        )}

        {billingScope === "none" && (
          <div className="pt-2 border-t border-gray-100 text-xs text-gray-500">
            No billable scope found yet. You might not be attached to an org or
            athlete profile.
          </div>
        )}

        {/* Upgrade section */}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Elite Upgrade
              </div>
              <p className="text-xs text-gray-500">
                Upgrade your{" "}
                {billingScope === "org"
                  ? "program"
                  : billingScope === "athlete"
                  ? "athlete profile"
                  : "account"}{" "}
                to unlock Elite features.
              </p>
            </div>

            <button
              onClick={handleUpgradeToElite}
              disabled={
                upgradeLoading || billingScope === "none" || isElite
              }
              className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition ${
                billingScope === "none" || isElite
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              }`}
            >
              {isElite
                ? "Already Elite"
                : upgradeLoading
                ? "Redirecting…"
                : "Upgrade to Elite"}
            </button>
          </div>

          {upgradeError && (
            <p className="mt-2 text-xs text-red-600">{upgradeError}</p>
          )}
        </div>
      </div>
    </div>
  );
}



