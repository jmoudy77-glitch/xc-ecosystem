// app/programs/[programId]/page.tsx
// Program Overview page (server component)

import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { mapPlanToTier, type PlanCode } from "@/lib/billingPlans";
import {
  hasPaidProgramPlan,
  canUseProgramRecruiting,
  canUseProgramAI,
  type ProgramBillingLite,
} from "@/lib/accessControl";

type PageProps = {
  params: Promise<{
    programId: string;
  }>;
};

type ProgramOverview = {
  id: string;
  name: string | null;
  sport: string | null;
  gender: string | null;
  level: string | null;
  season: string | null;
  school: {
    id: string;
    name: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    level: string | null;
  } | null;
};

type ProgramSubscriptionSummary = {
  planCode: PlanCode | string | null;
  status: string | null;
  currentPeriodEnd: string | null;
};

function formatLevelTag(level: string | null): string {
  if (!level) return "Unknown level";
  const v = level.toLowerCase();
  if (v === "hs" || v === "high_school" || v === "highschool") return "High school";
  if (v === "naia") return "NAIA";
  if (v === "njcaa") return "NJCAA";
  if (v === "ncaa_d1" || v === "d1") return "NCAA D1";
  if (v === "ncaa_d2" || v === "d2") return "NCAA D2";
  if (v === "ncaa_d3" || v === "d3") return "NCAA D3";
  return level;
}

function formatSportTag(sport: string | null): string {
  if (!sport) return "Unknown sport";
  return sport;
}

function formatGenderTag(gender: string | null): string {
  if (!gender) return "Co-ed / unknown";
  const g = gender.toLowerCase();
  if (g === "m" || g === "men" || g === "male") return "Men";
  if (g === "w" || g === "women" || g === "female") return "Women";
  return gender;
}

function formatSeasonTag(season: string | null): string {
  if (!season) return "Season not set";
  return season;
}

function formatRenewalLabel(currentPeriodEnd: string | null): string | null {
  if (!currentPeriodEnd) return null;
  const date = new Date(currentPeriodEnd);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ProgramOverviewPage({ params }: PageProps) {
  const { programId } = await params;

  const supabase = await supabaseServerComponent();

  // 1) Auth
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn("[ProgramOverview] auth.getUser error:", authError.message);
  }

  if (!authUser) {
    redirect("/login");
  }

  const authId = authUser.id;

  // 2) Ensure user row exists (matches dashboard logic)
  const { data: existingUserRow, error: userSelectError } = await supabaseAdmin
    .from("users")
    .select("id, auth_id, email")
    .eq("auth_id", authId)
    .maybeSingle();

  if (userSelectError) {
    console.error("[ProgramOverview] users select error:", userSelectError);
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
      console.error(
        "[ProgramOverview] Failed to create user row:",
        userInsertError
      );
      throw new Error("Failed to create user record");
    }

    userRow = insertedUser;
  }

  const userId = userRow.id as string;

  // 3) Confirm membership + load program basic info (with joined program)
  const { data: membershipRow, error: membershipError } = await supabaseAdmin
    .from("program_members")
    .select(
      `
      id,
      role,
      program_id,
      programs!inner (
        id,
        name,
        sport,
        gender,
        level,
        season,
        school:schools (
          id,
          name,
          city,
          state,
          country,
          level
        )
      )
    `
    )
    .eq("user_id", userId)
    .eq("program_id", programId)
    .maybeSingle();

  if (membershipError) {
    console.error(
      "[ProgramOverview] program_members select error:",
      membershipError
    );
    throw new Error("Failed to load program membership");
  }

  if (!membershipRow || !membershipRow.programs) {
    // Not a member of this program → bounce to dashboard
    redirect("/dashboard");
  }

  const programData = membershipRow.programs as any;

  const program: ProgramOverview = {
    id: programData.id,
    name: programData.name ?? null,
    sport: programData.sport ?? null,
    gender: programData.gender ?? null,
    level: programData.level ?? null,
    season: programData.season ?? null,
    school: programData.school
      ? {
          id: programData.school.id,
          name: programData.school.name ?? null,
          city: programData.school.city ?? null,
          state: programData.school.state ?? null,
          country: programData.school.country ?? null,
          level: programData.school.level ?? null,
        }
      : null,
  };

  const coachRole: string | null = membershipRow.role ?? null;

  // 4) Program subscription (latest row for this program)
  let subscriptionSummary: ProgramSubscriptionSummary | null = null;

  const { data: subRows, error: subError } = await supabaseAdmin
    .from("program_subscriptions")
    .select(
      "id, status, current_period_end, plan_code, stripe_subscription_id"
    )
    .eq("program_id", programId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (subError) {
    console.error(
      "[ProgramOverview] program_subscriptions select error:",
      subError
    );
  }

  if (subRows && subRows.length > 0) {
    const row = subRows[0] as any;
    subscriptionSummary = {
      planCode: (row.plan_code as PlanCode | string | null) ?? null,
      status: row.status ?? null,
      currentPeriodEnd: row.current_period_end
        ? new Date(row.current_period_end).toISOString()
        : null,
    };
  }

  const billingLite: ProgramBillingLite | null = subscriptionSummary
    ? {
        planCode: subscriptionSummary.planCode,
        status: subscriptionSummary.status,
      }
    : null;

  const hasPaid = hasPaidProgramPlan(billingLite);
  const canRecruit = canUseProgramRecruiting(billingLite);
  const canUseAi = canUseProgramAI(billingLite);

  const planTier = billingLite
    ? mapPlanToTier(billingLite.planCode as PlanCode | string)
    : "unknown";

  const renewalLabel = formatRenewalLabel(
    subscriptionSummary?.currentPeriodEnd ?? null
  );

  const school = program.school;

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
                {program.name || "Program overview"}
              </p>
              <p className="text-[11px] text-slate-400">
                {school?.name
                  ? `${school.name}${
                      school.city && school.state
                        ? ` — ${school.city}, ${school.state}`
                        : ""
                    }`
                  : "School not set"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-300">
            <span className="rounded-full border border-slate-700 px-2 py-0.5">
              {formatLevelTag(program.level)}
            </span>
            <span className="rounded-full border border-slate-700 px-2 py-0.5">
              {formatSportTag(program.sport)}
            </span>
            <span className="rounded-full border border-slate-700 px-2 py-0.5">
              {formatGenderTag(program.gender)}
            </span>
            <span className="rounded-full border border-slate-700 px-2 py-0.5">
              {formatSeasonTag(program.season)}
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6">
        {/* Top row: summary + billing */}
        <section className="grid gap-4 md:grid-cols-3">
          {/* Program summary */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Program overview
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Central view of this program&apos;s identity, staff, teams, and
              tools.
            </p>

            <div className="mt-3 space-y-2 text-xs">
              <p className="text-slate-200">
                Program ID:{" "}
                <span className="font-mono text-[11px] text-slate-100">
                  {program.id}
                </span>
              </p>
              {coachRole && (
                <p className="text-slate-200">
                  Your role:{" "}
                  <span className="font-mono text-[11px] text-slate-100">
                    {coachRole}
                  </span>
                </p>
              )}
              {school && (
                <p className="text-slate-200">
                  School level:{" "}
                  <span className="font-mono text-[11px] text-slate-100">
                    {school.level ?? "unknown"}
                  </span>
                </p>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
              <Link
                href={`/dashboard`}
                className="inline-flex items-center rounded-full border border-slate-600 px-3 py-1.5 font-medium text-slate-100 hover:border-slate-400"
              >
                ← Back to dashboard
              </Link>
              <Link
                href={`/programs/${program.id}/staff`}
                className="inline-flex items-center rounded-full border border-slate-600 px-3 py-1.5 font-medium text-slate-100 hover:border-slate-400"
              >
                Manage staff
              </Link>
              <Link
                href={`/programs/${program.id}/teams`}
                className="inline-flex items-center rounded-full border border-slate-600 px-3 py-1.5 font-medium text-slate-100 hover:border-slate-400"
              >
                Manage teams
              </Link>
              <Link
                href={`/programs/${program.id}/billing`}
                className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1.5 font-medium text-slate-950 hover:bg-white"
              >
                Manage billing
              </Link>
            </div>
          </div>

          {/* Billing snapshot */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Billing snapshot
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Subscription status for this specific program.
            </p>

            {subscriptionSummary ? (
              <div className="mt-3 space-y-1 text-xs">
                <p className="text-slate-200">
                  Plan:{" "}
                  <span className="font-mono text-[11px] text-slate-100">
                    {subscriptionSummary.planCode ?? "unknown"}
                  </span>
                </p>
                <p className="text-slate-200">
                  Tier:{" "}
                  <span className="font-mono text-[11px] text-slate-100">
                    {planTier}
                  </span>
                </p>
                <p className="text-slate-200">
                  Status: {subscriptionSummary.status ?? "unknown"}
                </p>
                {renewalLabel && (
                  <p className="text-slate-200">
                    Renews: <span className="font-mono">{renewalLabel}</span>
                  </p>
                )}
                <p className="mt-2 text-[11px] text-slate-400">
                  {hasPaid
                    ? "This program has an active paid subscription."
                    : "No active paid subscription detected for this program."}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-[11px] text-slate-500">
                No subscription found yet. You can start one from the billing
                page.
              </p>
            )}

            <div className="mt-3">
              <Link
                href={`/programs/${program.id}/billing`}
                className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-950 hover:bg-white"
              >
                Go to billing
              </Link>
            </div>
          </div>
        </section>

        {/* Feature access row */}
        <section className="grid gap-4 md:grid-cols-3">
          {/* Recruiting */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Recruiting workspace
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Central board for your recruits, classes, and pipeline.
            </p>
            <p className="mt-3 text-[11px] text-slate-400">
              Status:{" "}
              {canRecruit ? "Enabled for this program." : "Locked for this plan."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <button
                type="button"
                disabled={!canRecruit}
                className={`inline-flex items-center rounded-full px-3 py-1.5 font-medium ${
                  canRecruit
                    ? "bg-slate-50 text-slate-950 hover:bg-white"
                    : "border border-slate-700 text-slate-400 cursor-not-allowed"
                }`}
              >
                {canRecruit ? "Open recruiting board" : "Upgrade to unlock"}
              </button>
            </div>
          </div>

          {/* AI tools */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              AI coach tools
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Future modules for AI scout scores, commit probability, and
              pipeline projections.
            </p>
            <p className="mt-3 text-[11px] text-slate-400">
              Status: {canUseAi ? "Enabled for this program." : "Locked for this plan."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-400">
              <span className="rounded-full border border-slate-700 px-2 py-0.5">
                Scout Score
              </span>
              <span className="rounded-full border border-slate-700 px-2 py-0.5">
                Commit Probability
              </span>
              <span className="rounded-full border border-slate-700 px-2 py-0.5">
                Pipeline Projection
              </span>
            </div>
          </div>

          {/* Practice + scheduler placeholder */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Practice & season planning
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Future workspace for practices, meets, and weather-aware planning.
            </p>
            <p className="mt-3 text-[11px] text-slate-400">
              Status: roadmap feature (will be available to all paid program
              plans).
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}