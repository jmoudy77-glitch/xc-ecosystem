// app/dashboard/page.tsx
// Server Component dashboard using supabaseServerComponent + supabaseAdmin

import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { PlanCode } from "@/lib/billingPlans";

type RoleHint = "coach" | "athlete" | "both" | "unknown";

type BillingStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "unknown";

type ProgramBillingSummary = {
  programId: string;
  programName: string | null;
  planCode: PlanCode | null;
  status: BillingStatus;
  currentPeriodEnd: string | null;
};

type AthleteBillingSummary = {
  planCode: PlanCode | null;
  status: BillingStatus;
  currentPeriodEnd: string | null;
};

type MeResponse = {
  user: {
    id: string;
    email: string | null;
    fullName: string | null;
  };
  roleHint: RoleHint;
  billing: {
    athlete: AthleteBillingSummary | null;
    programs: ProgramBillingSummary[];
  };
};

function formatRoleLabel(roleHint: RoleHint | null): string {
  if (!roleHint) return "Account";
  if (roleHint === "coach") return "Head coach";
  if (roleHint === "athlete") return "Athlete";
  if (roleHint === "both") return "Head coach + athlete";
  return roleHint;
}

function normalizeStatus(status: string | null): BillingStatus {
  if (!status) return "unknown";
  const s = status.toLowerCase();
  if (s === "active") return "active";
  if (s === "trialing") return "trialing";
  if (s === "past_due") return "past_due";
  if (s === "canceled") return "canceled";
  if (s === "incomplete") return "incomplete";
  return "unknown";
}

export default async function DashboardPage() {
  const supabase = await supabaseServerComponent();

  // 1) Auth user
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn("[Dashboard] auth.getUser error:", authError.message);
  }

  if (!authUser) {
    redirect("/login");
  }

  const authId = authUser.id;

  const derivedFullName =
    (authUser.user_metadata as any)?.full_name ??
    (authUser.user_metadata as any)?.name ??
    null;

  // 2) Ensure user row
  const { data: existingUserRow, error: userSelectError } =
    await supabaseAdmin
      .from("users")
      .select("id, auth_id, email")
      .eq("auth_id", authId)
      .maybeSingle();

  if (userSelectError) {
    console.error("[Dashboard] users select error:", userSelectError);
    throw new Error("Failed to load user record");
  }

  let userRow = existingUserRow;

  if (!userRow) {
    const {
      data: insertedUser,
      error: userInsertError,
    } = await supabaseAdmin
      .from("users")
      .insert({
        auth_id: authId,
        email: authUser.email ?? null,
      })
      .select("id, auth_id, email")
      .single();

    if (userInsertError) {
      console.error("[Dashboard] Failed to create user row:", userInsertError);
      throw new Error("Failed to create user record");
    }

    userRow = insertedUser;
  }

  const userId = userRow.id as string;

  // 3) Athlete-level subscription
  let athleteBilling: AthleteBillingSummary | null = null;

  const { data: athleteSubscriptionRows, error: athleteSubError } =
    await supabaseAdmin
      .from("athlete_subscriptions")
      .select(
        "id, status, current_period_end, plan_code, stripe_subscription_id"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

  if (athleteSubError) {
    console.error(
      "[Dashboard] athlete_subscriptions select error:",
      athleteSubError
    );
  }

  if (athleteSubscriptionRows && athleteSubscriptionRows.length > 0) {
    const row = athleteSubscriptionRows[0];
    athleteBilling = {
      planCode: (row.plan_code as PlanCode | null) ?? null,
      status: normalizeStatus(row.status),
      currentPeriodEnd: row.current_period_end
        ? new Date(row.current_period_end).toISOString()
        : null,
    };
  }

  // 4) Program memberships + program-level subscriptions
  const { data: memberships, error: membershipError } = await supabaseAdmin
    .from("program_members")
    .select(
      `
      id,
      program_id,
      role,
      programs!inner (
        id,
        name
      )
    `
    )
    .eq("user_id", userId);

  if (membershipError) {
    console.error("[Dashboard] program_members select error:", membershipError);
  }

  const programsBasic: { id: string; name: string | null }[] =
    memberships?.map((m: any) => ({
      id: m.program_id,
      name: m.programs?.name ?? "Unnamed Program",
    })) ?? [];

  const programIds = programsBasic.map((p) => p.id);

  let programBillings: ProgramBillingSummary[] = [];

  if (programIds.length > 0) {
    const { data: programSubRows, error: programSubError } =
      await supabaseAdmin
        .from("program_subscriptions")
        .select(
          `
          id,
          status,
          current_period_end,
          plan_code,
          stripe_subscription_id,
          program_id
        `
        )
        .in("program_id", programIds);

    if (programSubError) {
      console.error(
        "[Dashboard] program_subscriptions select error:",
        programSubError
      );
    }

    const subsByProgram: Record<string, any[]> = {};
    (programSubRows ?? []).forEach((row) => {
      if (!subsByProgram[row.program_id]) {
        subsByProgram[row.program_id] = [];
      }
      subsByProgram[row.program_id].push(row);
    });

    programBillings = programsBasic.map((program) => {
      const subs = subsByProgram[program.id] ?? [];
      const latestSub = subs[0] ?? null;

      return {
        programId: program.id,
        programName: program.name,
        planCode: (latestSub?.plan_code as PlanCode | null) ?? null,
        status: normalizeStatus(latestSub?.status ?? null),
        currentPeriodEnd: latestSub?.current_period_end
          ? new Date(latestSub.current_period_end).toISOString()
          : null,
      };
    });
  }

  // 5) Role hint
  let roleHint: RoleHint = "unknown";

  const hasAthleteSub =
    athleteBilling && athleteBilling.status !== "canceled";
  const hasProgramMemberships = programsBasic.length > 0;

  if (hasAthleteSub && hasProgramMemberships) {
    roleHint = "both";
  } else if (hasAthleteSub) {
    roleHint = "athlete";
  } else if (hasProgramMemberships) {
    roleHint = "coach";
  }

  const me: MeResponse = {
    user: {
      id: userRow.id,
      email: userRow.email,
      fullName: derivedFullName,
    },
    roleHint,
    billing: {
      athlete: athleteBilling,
      programs: programBillings,
    },
  };

  const programs = me.billing.programs;
  const athlete = me.billing.athlete;
  const email = me.user.email;
  const fullName = me.user.fullName;
  const roleLabel = formatRoleLabel(me.roleHint);

  // Server component render (no loading/error states needed here)
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

            {/* New: athlete billing link */}
            {(roleHint === "athlete" || roleHint === "both") && (
              <Link
                href="/billing"
                className="text-[11px] text-slate-300 hover:text-slate-50"
              >
                Personal billing
              </Link>
            )}

            <Link
              href="/logout"
              className="text-[11px] text-slate-300 hover:text-slate-50"
            >
              Log out
            </Link>
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
                  {roleLabel} ({me.roleHint})
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

            {athlete ? (
              <div className="mt-3 space-y-1 text-xs">
                <p className="text-slate-200">
                  Plan:{" "}
                  <span className="font-mono text-[11px] text-slate-100">
                    {athlete.planCode ?? "unknown"}
                  </span>
                </p>
                <p className="text-slate-200">
                  Status: {athlete.status ?? "unknown"}
                </p>
                {athlete.currentPeriodEnd && (
                  <p className="text-slate-200">
                    Renews:{" "}
                    {new Date(athlete.currentPeriodEnd).toLocaleDateString()}
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
            {me.roleHint !== "athlete" && (
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
              {me.roleHint !== "athlete" && (
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
                          {new Date(
                            p.currentPeriodEnd
                          ).toLocaleDateString()}
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