// app/billing/BillingPageClient.tsx
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
// ⬇️ adjust these import paths to match your project structure
import { supabase } from '@/lib/supabaseClient';
import { orgHasActiveSubscription, orgHasAiFeatures } from '@/lib/billing';
// Minimal shape used in this component
type Organization = {
  id: string;
  name: string;
  subscription_tier: string | null;
  billing_status: string | null;
};


// If you hard-coded ORG_ID before, keep that here or import it instead:
const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID as string | undefined;

export default function BillingPageClient() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<Organization | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const searchParams = useSearchParams();
  const statusParam = searchParams?.get('status') ?? null;

  // 🔁 If you already had a useEffect that depended on searchParams/status
  useEffect(() => {
    async function loadBilling() {
      setLoading(true);
            setErrorMsg(null);
      
            const {
              data: { user },
            } = await supabase.auth.getUser();
      
            if (!user) {
              router.replace("/login");
              return;
            }
      
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
  }, [router,statusParam]); // or [] if you had no deps

  // ⬇️ Paste the rest of your existing JSX from page.tsx here
  async function handleUpgradeToElite() {
      try {
        setActionLoading(true);
        setErrorMsg(null);
  
        const res = await fetch("/api/checkout/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            priceId: process.env.STRIPE_PRICE_COLLEGE_ELITE, // won't exist at runtime; we'll just send null
            orgId: ORG_ID,
            tier: "elite",
          }),
        });
  
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to create checkout session");
        }
  
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error("No checkout URL returned from server");
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Error starting checkout");
        setActionLoading(false);
      }
    }
  
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
  
    const isActive = orgHasActiveSubscription(
  (org.billing_status ?? undefined) as any
);

const hasAi = orgHasAiFeatures(
  (org.subscription_tier ?? undefined) as any
);

  
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="max-w-xl mx-auto py-10 px-4 space-y-4">
          <h1 className="text-2xl font-semibold mb-2">Billing</h1>
  
          {statusParam === "success" && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm rounded-md p-3">
              Subscription updated successfully.
            </div>
          )}
  
          {statusParam === "cancelled" && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-md p-3">
              Checkout was cancelled. No changes were made.
            </div>
          )}
  
          {errorMsg && (
            <p className="text-xs text-red-600">{errorMsg}</p>
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
  
          <div className="space-y-2 text-sm">
            {!hasAi && (
              <button
                className="w-full py-2 rounded bg-slate-900 text-white font-semibold text-sm disabled:opacity-50"
                onClick={handleUpgradeToElite}
                disabled={actionLoading}
              >
                {actionLoading
                  ? "Redirecting to checkout..."
                  : "Upgrade to Elite (Unlock AI Tools)"}
              </button>
            )}
            {hasAi && (
              <p className="text-xs text-slate-600">
                You already have Elite / AI features enabled.
              </p>
            )}
          </div>
        </main>
      </div>
    );
}
