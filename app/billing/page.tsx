"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
  orgHasActiveSubscription,
  orgHasAiFeatures,
  BillingStatus,
  SubscriptionTier,
} from "@/lib/billing";

type Organization = {
  id: string;
  name: string;
  subscription_tier: SubscriptionTier;
  billing_status: BillingStatus;
};

// ⚠️ Use the SAME org id as in your dashboard:
const ORG_ID = "e6581ece-3386-4e70-bd05-7feb2e7fd5d9";

export default function BillingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<Organization | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadBilling() {
      setLoading(true);
      setErrorMsg(null);

      // 1) Make sure user is logged in
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      // 2) Fetch org by id (no .single(), do explicit length checks)
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, subscription_tier, billing_status")
        .eq("id", ORG_ID)
        .limit(1);

      if (error) {
        setErrorMsg(`Supabase error: ${error.message}`);
        setOrg(null);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setErrorMsg("No organization row returned from Supabase.");
        setOrg(null);
        setLoading(false);
        return;
      }

      setOrg(data[0] as Organization);
      setLoading(false);
    }

    loadBilling();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p>Loading billing...</p>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <p className="mb-2 font-semibold">No organization found.</p>
        {errorMsg && (
          <p className="text-xs text-red-600 max-w-md text-center">
            {errorMsg}
          </p>
        )}
      </div>
    );
  }

  const isActive = orgHasActiveSubscription(org.billing_status);
  const hasAi = orgHasAiFeatures(org.subscription_tier);

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-xl mx-auto py-10 px-4">
        <h1 className="text-2xl font-semibold mb-4">Billing</h1>

        {errorMsg && (
          <p className="mb-4 text-xs text-red-600">{errorMsg}</p>
        )}

        <div className="bg-white shadow rounded-md p-4 space-y-2 text-sm">
          <p>
            <span className="font-medium">Organization:</span> {org.name}
          </p>
          <p>
            <span className="font-medium">Subscription Tier:</span>{" "}
            {org.subscription_tier ?? "none"}
          </p>
          <p>
            <span className="font-medium">Billing Status:</span>{" "}
            {org.billing_status ?? "none"}
          </p>
          <p>
            <span className="font-medium">Active subscription?</span>{" "}
            {isActive ? "Yes" : "No"}
          </p>
          <p>
            <span className="font-medium">AI features?</span>{" "}
            {hasAi ? "Enabled" : "Not included"}
          </p>
        </div>

        <div className="mt-6 space-y-2 text-sm">
          <button
            className="w-full py-2 rounded bg-slate-900 text-white font-semibold text-sm disabled:opacity-50"
            disabled
          >
            Upgrade / Manage Subscription (coming in Day 3)
          </button>
          <p className="text-xs text-slate-500">
            This button will open Stripe Checkout or Customer Portal once the
            billing flow is wired up.
          </p>
        </div>
      </main>
    </div>
  );
}
