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

type MeResponse = {
  user: {
    id: string;
    email: string | null;
    fullName: string | null;
  };
  roleHint: string | null; // "coach" | "athlete" | "both" | "unknown"
  billing: {
    athlete: AthleteBillingSummary | null;
    programs: ProgramBillingSummary[];
  };
};

function formatRoleLabel(roleHint: string | null): string {
  if (!roleHint) return "Account";
  if (roleHint === "coach") return "Head coach";
  if (roleHint === "athlete") return "Athlete";
  if (roleHint === "both") return "Head coach + athlete";
  return roleHint;
}

export default function DashboardPage() {
  const router = useRouter();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setErrorMsg(null);

      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const body = (await res.json().catch(() => ({}))) as any;

        if (!mounted) return;

        if (!res.ok || ("error" in body && body.error)) {
          const message =
            "error" in body && body.error
              ? String(body.error)
              : `Failed to load account (${res.status})`;
          setErrorMsg(message);
          setLoading(false);
          return;
        }

        setMe(body as MeResponse);
        setLoading(false);
      } catch (err) {
        console.error("[Dashboard] Failed to load /api/me", err);
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
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("[Dashboard] logout error", err);
    } finally {
      router.replace("/login");
    }
  }

  const roleHint = me?.roleHint ?? "unknown";
  const roleLabel = formatRoleLabel(me?.roleHint ?? null);
  const programs: ProgramBillingSummary[] = me?.billing?.programs ?? [];
  const athleteBilling: AthleteBillingSummary | null =
    me?.billing?.athlete ?? null;
  const email = me?.user.email ?? null;
  const fullName = me?.user.fullName ?? null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-300">Loading dashboard…</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl border border-red-500/40 bg-red-950/40 p-5">
          <p className="text-sm font-semibold text-red-100">
            Problem loading your dashboard
          </p>
          <p className="mt-2 text-xs text-red-200">{errorMsg}</p>
          <div className="mt-4 flex justify-between items-center">
            <button
              type="button"
              onClick={() => router.refresh()}
              className="rounded-full bg-red-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-400"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="text-[11px] text-red-100/80 hover:underline"
            >
              Log out
            </button>
          </div>
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
              <p className="text-xs font-medium text-slate-100">
                {fullName || email || "Account"}
              </p>
              <p className="text-[11px] text-slate-400">{roleLabel}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="text-[11px] text-slate-300 hover:text-slate-50"
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
            <p className="mt-1 text-[11px] text-slate-500">
              Overview of your XC Ecosystem account.
            </p>

            <div className="mt-3 space-y-2 text-xs">
              <p className="text-slate-200">
                Email:{" "}
                <span className="font-mono text-[11px] text-slate-100">
                  {email ?? "unknown"}
                </span>
              </p>
              <p className="text-slate-200">
                Role:{" "}
                <span className="font-mono text-[11px] text-slate-100">
                  {roleLabel} ({roleHint})
                </span>
              </p>
            </div>
          </div>

          {/* Athlete subscription card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Athlete subscription
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Billing for your personal athlete tools (separate from program
              billing).
            </p>

            {athleteBilling ? (
              <div className="mt-3 space-y-1 text-xs">
                <p className="text-slate-200">
                  Plan:{" "}
                  <span className="font-mono text-[11px] text-slate-100">
                    {athleteBilling.planCode ?? "unknown"}
                  </span>
                </p>
                <p className="text-slate-200">
                  Status: {athleteBilling.status ?? "unknown"}
                </p>
                {athleteBilling.currentPeriodEnd && (
                  <p className="text-slate-200">
                    Renews:{" "}
                    {new Date(
                      athleteBilling.currentPeriodEnd
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
            {roleHint !== "athlete" && (
              <div>
                <Link
                  href="/programs/create"
                  className="inline-flex items-center rounded-full border border-slate-600 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:border-slate-400"
                >
                  + New program
                </Link>
              </div>
            )}
          </div>

          {programs.length === 0 ? (
            <div className="mt-3 space-y-2 text-[11px] text-slate-500">
              <p>No programs found for this account yet.</p>
              {roleHint !== "athlete" && (
                <Link
                  href="/programs/create"
                  className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-950 hover:bg-white"
                >
                  Create your first program
                </Link>
              )}
            </div>
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
                          {" "}
                          · Renews{" "}
                          {new Date(p.currentPeriodEnd).toLocaleDateString()}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/programs/${p.programId}`}
                      className="rounded-full border border-slate-600 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:border-slate-400"
                    >
                      Overview
                    </Link>
                    <Link
                      href={`/programs/${p.programId}/staff`}
                      className="rounded-full border border-slate-600 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:border-slate-400"
                    >
                      Staff
                    </Link>
                    <Link
                      href={`/programs/${p.programId}/teams`}
                      className="rounded-full border border-slate-600 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:border-slate-400"
                    >
                      Teams
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
