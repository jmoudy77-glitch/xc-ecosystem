// app/billing/BillingPageClient.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

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

  if (loading) {
    return <div>Loading billing info…</div>;
  }

  if (error) {
    return (
      <div className="text-red-600">
        Failed to load billing info:
        <br />
        <code className="text-xs block mt-1">{error}</code>
      </div>
    );
  }

  if (!data) {
    return <div>No account info found.</div>;
  }

  const { user, billingScope, org, athlete, tiers } = data;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Billing</h1>

      <div className="rounded-lg border p-4 space-y-2">
        <div>
          <div className="text-sm text-gray-500">Signed in as</div>
          <div className="font-medium">{user.email}</div>
          <div className="text-xs text-gray-500">
            Role: {user.role} • Billing scope: {billingScope}
          </div>
        </div>

        {billingScope === "org" && org && (
          <div className="mt-3">
            <div className="text-sm text-gray-500">Organization</div>
            <div className="font-medium">{org.name}</div>
            <div className="text-xs text-gray-500">
              Current plan: {tiers.org ?? "None"}
            </div>
          </div>
        )}

        {billingScope === "athlete" && athlete && (
          <div className="mt-3">
            <div className="text-sm text-gray-500">Athlete</div>
            <div className="font-medium">{athlete.name}</div>
            <div className="text-xs text-gray-500">
              Current plan: {tiers.athlete ?? "HS ATHLETE BASIC"}
            </div>
          </div>
        )}

        {billingScope === "none" && (
          <div className="mt-3 text-xs text-gray-500">
            No billable scope found yet. You might not be attached to an org or
            athlete profile.
          </div>
        )}
      </div>
    </div>
  );
}


