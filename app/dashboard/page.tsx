"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  orgHasActiveSubscription,
  orgHasAiFeatures,
  BillingStatus,
  SubscriptionTier,
} from "@/lib/billing";

type Recruit = {
  id: string;
  first_name: string;
  last_name: string;
  grad_year: number;
  event_group: string;
  status: string;
  notes: string | null;
};

type Organization = {
  id: string;
  name: string;
  subscription_tier: SubscriptionTier;
  billing_status: BillingStatus;
};

// ⚠️ Use the SAME id as in organizations + billing page
const ORG_ID = "e6581ece-3386-4e70-bd05-7feb2e7fd5d9";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [recruits, setRecruits] = useState<Recruit[]>([]);
  const [org, setOrg] = useState<Organization | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setErrorMsg(null);

      // 1) Ensure user is logged in
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      setEmail(user.email ?? null);

      // 2) Fetch organization
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("id, name, subscription_tier, billing_status")
        .eq("id", ORG_ID)
        .limit(1);

      if (orgError) {
        setErrorMsg(`Error loading organization: ${orgError.message}`);
        setLoading(false);
        return;
      }

      if (!orgData || orgData.length === 0) {
        setErrorMsg("No organization found for this id.");
        setLoading(false);
        return;
      }

      const organization = orgData[0] as Organization;
      setOrg(organization);

      // 3) Fetch recruits for this organization
      const { data: recruitsData, error: recruitsError } = await supabase
        .from("recruits")
        .select("*")
        .eq("organization_id", ORG_ID)
        .order("grad_year", { ascending: true });

      if (recruitsError) {
        setErrorMsg(`Error loading recruits: ${recruitsError.message}`);
        setLoading(false);
        return;
      }

      setRecruits((recruitsData as Recruit[]) || []);
      setLoading(false);
    }

    loadDashboard();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p>Loading dashboard...</p>
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
      <header className="w-full bg-slate-900 text-white px-6 py-3 flex justify-between items-center">
        <h1 className="font-semibold text-lg">XC Ecosystem Dashboard</h1>
        <div className="flex items-center gap-4 text-sm">
          {email && <span>{email}</span>}
          <button
            onClick={handleLogout}
            className="px-3 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        <div className="mb-6">
          <Link
            href="/athlete/profile"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
          >
            View My Athlete Profile
          </Link>
        </div>
        {/* Billing summary card */}
        <section className="bg-white shadow rounded-md p-4 text-sm flex justify-between items-center">
          <div>
            <p className="font-semibold">{org.name}</p>
            <p className="text-slate-600">
              Tier: <span className="font-medium">{org.subscription_tier ?? "none"}</span> · Status:{" "}
              <span className="font-medium">{org.billing_status ?? "none"}</span>
            </p>
          </div>
          <div className="text-right text-xs">
            <p>
              Active subscription?{" "}
              <span className="font-semibold">
                {isActive ? "Yes" : "No"}
              </span>
            </p>
            <p>
              AI features:{" "}
              <span className="font-semibold">
                {hasAi ? "Enabled" : "Not included"}
              </span>
            </p>
          </div>
        </section>

        {/* AI banner */}
        {!hasAi && (
          <section className="bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-md p-3">
            <p className="font-semibold mb-1">
              Upgrade to Elite to unlock AI tools.
            </p>
            <p>
              AI recruiting pipeline projections and AI training plan suggestions
              are available on the Elite tier.
            </p>
          </section>
        )}

        {/* Recruits table */}
        <section>
          <h2 className="text-xl font-semibold mb-3">Recruits</h2>

          {errorMsg && (
            <p className="mb-4 text-sm text-red-600">{errorMsg}</p>
          )}

          {recruits.length === 0 ? (
            <p className="text-sm text-slate-700">
              No recruits found for this organization yet.
            </p>
          ) : (
            <div className="overflow-x-auto border rounded bg-white shadow-sm">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Grad Year</th>
                    <th className="px-3 py-2 text-left">Event Group</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {recruits.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2">
                        {r.first_name} {r.last_name}
                      </td>
                      <td className="px-3 py-2">{r.grad_year}</td>
                      <td className="px-3 py-2">{r.event_group}</td>
                      <td className="px-3 py-2 capitalize">{r.status}</td>
                      <td className="px-3 py-2 max-w-xs truncate">
                        {r.notes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

