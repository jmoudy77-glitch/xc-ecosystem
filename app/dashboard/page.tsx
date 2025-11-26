"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Recruit = {
  id: string;
  first_name: string;
  last_name: string;
  grad_year: number;
  event_group: string;
  status: string;
  notes: string | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [recruits, setRecruits] = useState<Recruit[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setErrorMsg(null);

      // 1) Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      setEmail(user.email ?? null);

      // 2) Look up memberships for this user
      const { data: memberships, error: membershipError } = await supabase
        .from("memberships")
        .select("organization_id")
        .limit(1);

      if (membershipError) {
        setErrorMsg(`Error loading memberships: ${membershipError.message}`);
        setLoading(false);
        return;
      }

      if (!memberships || memberships.length === 0) {
        setErrorMsg("No organization found for this user.");
        setLoading(false);
        return;
      }

      const organizationId = memberships[0].organization_id as string;
      setOrgId(organizationId);

      // 3) Load recruits for this organization
      const { data: recruitsData, error: recruitsError } = await supabase
        .from("recruits")
        .select("*")
        .eq("organization_id", organizationId)
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
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading dashboard...</p>
      </div>
    );
  }

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

      <main className="max-w-5xl mx-auto py-8 px-4">
        <h2 className="text-xl font-semibold mb-4">Recruits</h2>

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
      </main>
    </div>
  );
}
