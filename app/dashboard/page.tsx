"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Not logged in – send to login
        router.replace("/login");
        return;
      }

      setEmail(user.email);
      setLoading(false);
    }

    loadUser();
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
          <span>{email}</span>
          <button
            onClick={handleLogout}
            className="px-3 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto py-8 px-4">
        <h2 className="text-xl font-semibold mb-4">
          Welcome to your dashboard
        </h2>
        <p className="text-sm text-slate-700">
          This area will become the College Coach / HS Coach home base with:
        </p>
        <ul className="list-disc ml-6 mt-2 text-sm text-slate-700">
          <li>Recruits list and statuses</li>
          <li>Current roster and team management</li>
          <li>Recruiting pipeline projections</li>
          <li>AI training plan recommendations</li>
        </ul>
      </main>
    </div>
  );
}
