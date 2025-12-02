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

type AthleteBillingSummary = {
  planCode: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
};

type MeOkResponse = {
  user: {
    id: string;
    email: string | null;
    fullName: string | null;
  } | null;
  roleHint?: string | null;
  billing?: {
    athlete?: AthleteBillingSummary | null;
    programs?: ProgramBillingSummary[];
  };
};

type MeErrorResponse = {
  error: string;
};

type MeResponse = MeOkResponse | MeErrorResponse;

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

        if (res.status === 401) {
          // Not authenticated -> send to login
          router.replace("/login");
          return;
        }

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
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const user =
    me && "user" in me && me.user
      ? me.user
      : { id: "", email: null as string | null, fullName: null as string | null };

  const programs: ProgramBillingSummary[] =
    me && "billing" in me && me.billing?.programs
      ? me.billing.programs ?? []
      : [];

  const athleteBilling: AthleteBillingSummary | null =
    me && "billing" in me ? me.billing?.athlete ?? null : null;

  const roleHint =
    me && "roleHint" in me ? (me as MeOkResponse).roleHint ?? null : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <p className="text-sm text-slate-400">Loading dashboard...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="max-w-md w-full rounded-xl border border-red-500/40 bg-red-950/60 px-4 py-3 text-sm text-red-100">
          <p className="font-semibold mb-1">Failed to load dashboard</p>
          <p className="mb-3 text-xs text-red-200">{errorMsg}</p>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="rounded-full bg-red-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-400"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Top nav header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-50 text-slate-950 flex items-center justify-center text-xs font-semibold">
              XC
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-50">
                XC Ecosystem
              </p>
              <p className="text-[11px] text-slate-400">
                Central hub for your programs and athletes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-50">
                {user.fullName || user.email || "Coach"}
              </p>
              {roleHint && (
                <p className="text-[11px] text-slate-400">{roleHint}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-100 hover:border-slate-400"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6">
        {/* Top row: account + athlete billing */}
        <section className="grid gap-4 md:grid-cols-3">
          {/* Account card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Account
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-50">
              {user.fullName || user.email || "Your account"}
            </p>
            {user.email && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                {user.email}
              </p>
            )}
            <p className="mt-3 text-[11px] text-slate-500">
              This dashboard pulls from your{" "}
              <span className="font-mono text-[11px] text-slate-300">
                /api/me
              </span>
              , which consolidates user, program, and billing context. As you
              add more features (rosters, boards, AI scoring), this page can
              evolve into a full coach home screen.
            </p>
          </div>

          {/* Athlete subscription card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Athlete subscription
            </p>
            {athleteBilling && athleteBilling.planCode ? (
              <div className="mt-2 space-y-1 text-xs text-slate-100">
                <p className="font-semibold">
                  Plan:{" "}
                  <span className="font-mono">
                    {athleteBilling.planCode}
                  </span>
                </p>
                <p className="text-slate-300">
                  Status: {athleteBilling.status ?? "unknown"}
                </p>
                {athleteBilling.currentPeriodEnd && (
                  <p className="text-slate-300">
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
        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Programs
              </p>
              <p className="text-[11px] text-slate-500">
                Programs attached to your account via memberships and program
                subscriptions.
              </p>
            </div>
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
                  className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-3 text-xs text-slate-100 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-50">
                      {p.programName || "Unnamed program"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Program ID:{" "}
                      <span className="font-mono text-[11px] text-slate-300">
                        {p.programId}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Plan:{" "}
                      <span className="font-mono text-[11px] text-slate-300">
                        {p.planCode ?? "none"}
                      </span>{" "}
                      · Status: {p.status ?? "unknown"}
                      {p.currentPeriodEnd && (
                        <>
                          {" "}· Renews{" "}
                          {new Date(p.currentPeriodEnd).toLocaleDateString()}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/programs/${p.programId}`}
                      className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:border-slate-400"
                    >
                      Overview
                    </Link>
                    <Link
                      href={`/programs/${p.programId}/staff`}
                      className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:border-slate-400"
                    >
                      Team
                    </Link>
                    <Link
                      href={`/programs/${p.programId}/billing`}
                      className="rounded-full bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-950 hover:bg-white"
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
