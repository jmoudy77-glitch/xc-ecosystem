// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type ProgramBillingSummary = {
  programId: string;
  programName: string | null;
  planCode: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
};

type MeResponse =
  | {
      user: {
        id: string;
        email: string | null;
        name: string | null;
      } | null;
      roleHint?: string | null;
      billing?: {
        athlete?: {
          planCode: string | null;
          status: string | null;
          currentPeriodEnd: string | null;
        } | null;
        programs?: ProgramBillingSummary[];
      };
      error?: undefined;
    }
  | {
      error: string;
    };

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setErrorMsg(null);

        const res = await fetch("/api/me", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const body = (await res.json().catch(() => ({}))) as MeResponse;

        if (!mounted) return;

        if (!res.ok || ("error" in body && body.error)) {
          const message =
            "error" in body && body.error
              ? body.error
              : `Failed to load account (${res.status})`;
          setErrorMsg(message);
          setLoading(false);
          return;
        }

        setMe(body);
        setLoading(false);
      } catch (err) {
        console.error("[Dashboard] Failed to load /api/me:", err);
        if (!mounted) return;
        setErrorMsg("Unexpected error loading dashboard.");
        setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const user =
    me && "user" in me && me.user
      ? me.user
      : { id: "", email: null, name: null };

  const programs: ProgramBillingSummary[] =
    me && "billing" in me && me.billing?.programs
      ? me.billing.programs ?? []
      : [];

  const athleteBilling =
    me && "billing" in me ? me.billing?.athlete ?? null : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading dashboard...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="max-w-md w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <p className="font-semibold mb-1">Failed to load dashboard</p>
          <p className="mb-3">{errorMsg}</p>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">
              XC
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Recruiting Ecosystem
              </p>
              <p className="text-[11px] text-slate-500">
                Central hub for your programs and athletes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-900">
                {user.name || user.email || "Coach"}
              </p>
              {"roleHint" in (me || {}) && (me as any)?.roleHint && (
                <p className="text-[11px] text-slate-500">
                  {(me as any).roleHint}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4">
        {/* Top row: user + athlete billing (if any) */}
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Account
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {user.name || user.email || "Your account"}
            </p>
            {user.email && (
              <p className="text-[11px] text-slate-500 mt-0.5">
                {user.email}
              </p>
            )}
            <p className="mt-3 text-[11px] text-slate-500">
              This dashboard pulls from your{" "}
              <span className="font-mono text-[11px]">/api/me</span> endpoint,
              which consolidates user, program, and billing context. As you add
              more features (rosters, boards, AI scoring), this page can evolve
              into a full coach home screen.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Athlete subscription
            </p>
            {athleteBilling && athleteBilling.planCode ? (
              <div className="mt-2 space-y-1 text-xs text-slate-800">
                <p className="font-semibold">
                  Plan:{" "}
                  <span className="font-mono">{athleteBilling.planCode}</span>
                </p>
                <p>Status: {athleteBilling.status ?? "unknown"}</p>
                {athleteBilling.currentPeriodEnd && (
                  <p>
                    Renews:{" "}
                    {new Date(
                      athleteBilling.currentPeriodEnd,
                    ).toLocaleDateString()}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-slate-500">
                No athlete-level subscription found.
              </p>
            )}
          </div>
        </section>

        {/* Programs list */}
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Programs
              </p>
              <p className="text-[11px] text-slate-500">
                Programs attached to your account via memberships and program
                subscriptions.
              </p>
            </div>
            <Link
              href="/debug/program-billing"
              className="text-[11px] text-blue-600 hover:text-blue-700 underline"
            >
              Open billing debug
            </Link>
          </div>

          {programs.length === 0 ? (
            <p className="mt-3 text-[11px] text-slate-500">
              No programs found for this account yet.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {programs.map((p) => (
                <div
                  key={p.programId}
                  className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-semibold">
                      {p.programName || "Unnamed program"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Program ID:{" "}
                      <span className="font-mono text-[11px]">
                        {p.programId}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Plan:{" "}
                      <span className="font-mono text-[11px]">
                        {p.planCode ?? "none"}
                      </span>{" "}
                      · Status: {p.status ?? "unknown"}
                      {p.currentPeriodEnd && (
                        <>
                          {" "}
                          · Renews{" "}
                          {new Date(p.currentPeriodEnd).toLocaleDateString()}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/programs/${p.programId}`}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Open overview
                    </Link>
                    <Link
                      href={`/programs/${p.programId}/billing`}
                      className="rounded-md bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-slate-800"
                    >
                      Manage billing
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
