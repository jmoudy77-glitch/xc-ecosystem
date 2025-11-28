// app/billing/BillingPageClient.tsx
"use client";

import { useEffect, useState } from "react";

type BillingScope = "org" | "athlete";
type BillingPlan = "free" | "elite" | "pro";
type BillingStatus = "active" | "past_due" | "canceled" | "trialing" | "none";

type MeResponse = {
  user: {
    id: string;
    email: string;
    name?: string | null;
    role: "coach" | "athlete";
  };
  org?: {
    id: string;
    name: string;
  };
  athleteProfile?: {
    id: string;
    name: string;
    gradYear?: number | null;
  };
  billing: {
    scope: BillingScope;
    plan: BillingPlan;
    status: BillingStatus;
    renewsAt?: string | null;
  };
};

function extractErrorMessage(data: unknown, fallback: string): string {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof (data as { error: unknown }).error === "string"
  ) {
    return (data as { error: string }).error;
  }
  return fallback;
}

function extractUrl(data: unknown): string | undefined {
  if (
    data &&
    typeof data === "object" &&
    "url" in data &&
    typeof (data as { url: unknown }).url === "string"
  ) {
    return (data as { url: string }).url;
  }
  return undefined;
}

export default function BillingPageClient() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load /api/me on mount
  useEffect(() => {
    let isMounted = true;

    async function loadMe() {
      try {
        setError(null);
        setLoadingMe(true);
        const res = await fetch("/api/me", { method: "GET" });

        if (!res.ok) {
          let msg = `Failed to load account info (${res.status})`;
          try {
            const data: unknown = await res.json();
            msg = extractErrorMessage(data, msg);
          } catch {
            // ignore JSON parse error, keep fallback
          }
          throw new Error(msg);
        }

        const data = (await res.json()) as MeResponse;
        if (isMounted) {
          setMe(data);
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Unexpected error loading account";
        console.error("Error loading /api/me:", message);
        if (isMounted) {
          setError(message);
        }
      } finally {
        if (isMounted) {
          setLoadingMe(false);
        }
      }
    }

    loadMe();

    return () => {
      isMounted = false;
    };
  }, []);

  async function startPortal() {
  try {
    const res = await fetch("/billing/create-portal-session", {
      method: "POST",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to open portal");
    }

    const { url } = await res.json();
    if (!url) throw new Error("Stripe portal returned no URL");

    window.location.href = url;
  } catch (err: unknown) {
    console.error("Portal error:", err);
    alert(err instanceof Error ? err.message : "Unknown error");
  }
}


  async function startCheckout() {
    try {
      setError(null);
      setLoadingCheckout(true);

      if (!me) {
        throw new Error("Cannot start checkout: user is not loaded");
      }

      const scope: BillingScope = me.billing.scope;
      const orgId = me.org?.id;
      const athleteId = me.athleteProfile?.id;

      const body =
        scope === "org"
          ? { scope: "org", tier: "elite", orgId }
          : { scope: "athlete", tier: "elite", athleteId };

      if (scope === "org" && !orgId) {
        throw new Error("No organization attached to this user.");
      }
      if (scope === "athlete" && !athleteId) {
        throw new Error("No athlete profile attached to this user.");
      }

      const res = await fetch("/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: me.billing.scope,   // "org" | "athlete"
          tier: "pro",               // or "elite"
          orgId: me.org?.id,
          athleteId: me.user.id,
        }),
      });

      let data: unknown = null;
      try {
        data = await res.json();
      } catch {
        // it's fine if there is no JSON body; we'll handle with fallbacks
      }

      if (!res.ok) {
        const msg = extractErrorMessage(data, "Failed to start checkout");
        throw new Error(msg);
      }

      const url = extractUrl(data);

      if (!url) {
        throw new Error("No checkout URL returned from server");
      }

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unexpected checkout error";
      console.error("Checkout error:", message);
      setError(message);
    } finally {
      setLoadingCheckout(false);
    }
  }

  const isCoach = me?.user.role === "coach";
  const scope = me?.billing.scope;
  const plan = me?.billing.plan ?? "free";
  const status = me?.billing.status ?? "none";

  const scopeLabel =
    scope === "org"
      ? "Coach / Program Plan"
      : scope === "athlete"
      ? "Athlete Plan"
      : "Plan";

  const upgradeLabel =
    scope === "org" ? "Upgrade Program to Elite" : "Upgrade Athlete to Elite";

  const isAlreadyElite = plan === "elite" && status === "active";

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Billing & Plans</h1>
        <p className="text-sm text-gray-600">
          Manage your subscription for the recruiting ecosystem. We’ll
          automatically detect whether you’re acting as a{" "}
          <span className="font-medium">
            {isCoach ? "coach / program" : "athlete"}
          </span>{" "}
          and route billing to the right place.
        </p>
      </header>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loadingMe && (
        <section className="border rounded-lg p-4 space-y-3 animate-pulse">
          <div className="h-4 w-40 bg-gray-200 rounded" />
          <div className="h-3 w-full bg-gray-200 rounded" />
          <div className="h-3 w-2/3 bg-gray-200 rounded" />
          <div className="h-9 w-48 bg-gray-200 rounded mt-3" />
        </section>
      )}

      {/* Main card once /api/me is loaded */}
      {!loadingMe && me && (
        <section className="border rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">{scopeLabel}</h2>

              <p className="text-sm text-gray-600">
                {scope === "org" ? (
                  <>
                    Unlock recruiting tools for your entire program: coach
                    dashboards, recruiting boards, pipeline planner, and the AI
                    scout assistant for your staff.
                  </>
                ) : (
                  <>
                    Personal account for athletes: profile tools, visibility, and
                    AI guidance—even if your current team hasn&apos;t joined yet.
                  </>
                )}
              </p>

              <button
                type="button"
                onClick={startPortal}
                className="mt-2 inline-flex items-center px-4 py-2 rounded bg-gray-800 text-white text-sm"
              >
                Manage Subscription
              </button>


              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center rounded-full border px-2 py-0.5 bg-gray-50">
                  <span className="mr-1 h-2 w-2 rounded-full bg-emerald-500" />
                  Current plan:{" "}
                  <span className="ml-1 font-medium capitalize">{plan}</span>
                  {scope && (
                    <span className="ml-1 text-gray-500">
                      ({scope === "org" ? "program" : "athlete"})
                    </span>
                  )}
                </span>
                <span className="inline-flex items-center rounded-full border px-2 py-0.5 bg-gray-50">
                  Status:{" "}
                  <span className="ml-1 font-medium capitalize">
                    {status.replace("_", " ")}
                  </span>
                </span>
                {me.org && scope === "org" && (
                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 bg-gray-50">
                    Program:{" "}
                    <span className="ml-1 font-medium">{me.org.name}</span>
                  </span>
                )}
                {me.athleteProfile && scope === "athlete" && (
                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 bg-gray-50">
                    Athlete:{" "}
                    <span className="ml-1 font-medium">
                      {me.athleteProfile.name}
                    </span>
                    {me.athleteProfile.gradYear && (
                      <span className="ml-1 text-gray-500">
                        ({me.athleteProfile.gradYear})
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="pt-3">
            {isAlreadyElite ? (
              <button
                type="button"
                disabled
                className="inline-flex items-center px-4 py-2 rounded bg-gray-200 text-gray-700 text-sm cursor-default"
              >
                You&apos;re already on the Elite plan
              </button>
            ) : (
              <button
                type="button"
                onClick={startCheckout}
                disabled={loadingCheckout}
                className="inline-flex items-center px-4 py-2 rounded bg-black text-white text-sm disabled:opacity-60"
              >
                {loadingCheckout ? "Redirecting to Stripe..." : upgradeLabel}
              </button>
            )}
          </div>
        </section>
      )}

      {/* Fallback if /api/me completely fails */}
      {!loadingMe && !me && (
        <section className="border rounded-lg p-4 space-y-2">
          <h2 className="text-xl font-semibold">Billing</h2>
          <p className="text-sm text-gray-600">
            We couldn&apos;t load your account details. Try refreshing the page.
            If this continues, contact support.
          </p>
        </section>
      )}
    </main>
  );
}


