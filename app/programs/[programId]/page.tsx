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
  if (v === "hs" || v === "high_school" || v === "highschool")
    return "High school";
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
        userInsertError,
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
    `,
    )
    .eq("user_id", userId)
    .eq("program_id", programId)
    .maybeSingle();

  if (membershipError) {
    console.error(
      "[ProgramOverview] program_members select error:",
      membershipError,
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
      "id, status, current_period_end, plan_code, stripe_subscription_id",
    )
    .eq("program_id", programId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (subError) {
    console.error(
      "[ProgramOverview] program_subscriptions select error:",
      subError,
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
    subscriptionSummary?.currentPeriodEnd ?? null,
  );

  const school = program.school;

  return (
    <>
      {/* Top row: summary + billing */}
      <section className="grid gap-4 md:grid-cols-3">
        {/* Program summary */}
        <div className="rounded-xl border border-subtle bg-brand-soft p-5 md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Program overview
          </p>
          <p className="mt-1 text-[11px] text-muted">
            Central view of this program&apos;s identity, staff, teams, and
            tools.
          </p>

          <div className="mt-3 space-y-2 text-xs">
            <p>
              Program name:{" "}
              <span className="font-mono text-[11px] text-slate-100">
                {program.name ?? "Unnamed program"}
              </span>
            </p>
            <p>
              Sport:{" "}
              <span className="font-mono text-[11px] text-slate-100">
                {formatSportTag(program.sport)}
              </span>
            </p>
            <p>
              Level:{" "}
              <span className="font-mono text-[11px] text-slate-100">
                {formatLevelTag(program.level)}
              </span>
            </p>
            <p>
              Gender:{" "}
              <span className="font-mono text-[11px] text-slate-100">
                {formatGenderTag(program.gender)}
              </span>
            </p>
            <p>
              Season:{" "}
              <span className="font-mono text-[11px] text-slate-100">
                {formatSeasonTag(program.season)}
              </span>
            </p>
            {coachRole && (
              <p>
                Your role:{" "}
                <span className="font-mono text-[11px] text-slate-100">
                  {coachRole}
                </span>
              </p>
            )}
            {school && (
              <p>
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
              className="inline-flex items-center rounded-full border border-subtle px-3 py-1.5 text-[11px] font-medium hover:bg-brand-soft/80"
            >
              ← Back to dashboard
            </Link>
            {/* 👉 Direct entry to staff & permissions */}
            <Link
              href={`/programs/${program.id}/staff`}
              className="inline-flex items-center rounded-full border border-subtle px-3 py-1.5 text-[11px] font-medium hover:bg-brand-soft/80"
            >
              Manage staff
            </Link>
            <Link
              href={`/programs/${program.id}/teams`}
              className="inline-flex items-center rounded-full border border-subtle px-3 py-1.5 text-[11px] font-medium hover:bg-brand-soft/80"
            >
              Manage teams
            </Link>
            <Link
              href={`/programs/${program.id}/billing`}
              className="inline-flex items-center rounded-full bg-brand px-3 py-1.5 text-[11px] font-medium hover:bg-brand-soft"
            >
              Manage billing
            </Link>
          </div>
        </div>

        {/* Billing snapshot */}
        <div className="rounded-xl border border-subtle bg-brand-soft p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Billing snapshot
          </p>
          <p className="mt-1 text-[11px] text-muted">
            Subscription status for this specific program.
          </p>

          {subscriptionSummary ? (
            <div className="mt-3 space-y-1 text-xs">
              <p>
                Plan:{" "}
                <span className="font-mono text-[11px] text-slate-100">
                  {subscriptionSummary.planCode ?? "unknown"}
                </span>
              </p>
              <p>
                Tier:{" "}
                <span className="font-mono text-[11px] text-slate-100">
                  {planTier}
                </span>
              </p>
              <p>
                Status: {subscriptionSummary.status ?? "unknown"}
              </p>
              {renewalLabel && (
                <p>
                  Renews: <span className="font-mono">{renewalLabel}</span>
                </p>
              )}
              <p className="mt-2 text-[11px] text-muted">
                {hasPaid
                  ? "This program has an active paid subscription."
                  : "No active paid subscription detected for this program."}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-[11px] text-muted">
              No subscription found yet. You can start one from the billing
              page.
            </p>
          )}

          <div className="mt-3">
            <Link
              href={`/programs/${program.id}/billing`}
              className="inline-flex items-center rounded-full bg-brand px-3 py-1.5 text-[11px] font-medium hover:bg-brand-soft"
            >
              Go to billing
            </Link>
          </div>
        </div>
      </section>

      {/* Feature access row */}
      <section className="grid gap-4 md:grid-cols-3">
        {/* Recruiting */}
        <div className="rounded-xl border border-subtle bg-brand-soft p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Recruiting workspace
          </p>
          <p className="mt-1 text-[11px] text-muted">
            Central board for your recruits, classes, and pipeline.
          </p>
          <p className="mt-3 text-[11px] text-muted">
            Status:{" "}
            {canRecruit ? "Enabled for this program." : "Locked for this plan."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <button
              type="button"
              disabled={!canRecruit}
              className={`inline-flex items-center rounded-full px-3 py-1.5 font-medium ${
                canRecruit
                  ? "bg-brand hover:bg-brand-soft"
                  : "border border-subtle text-muted cursor-not-allowed"
              }`}
            >
              {canRecruit ? "Open recruiting board" : "Upgrade to unlock"}
            </button>
          </div>
        </div>

        {/* AI tools */}
        <div className="rounded-xl border border-subtle bg-brand-soft p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            AI coach tools
          </p>
          <p className="mt-1 text-[11px] text-muted">
            Future modules for AI scout scores, commit probability, and
            pipeline projections.
          </p>
          <p className="mt-3 text-[11px] text-muted">
            Status:{" "}
            {canUseAi ? "Enabled for this program." : "Locked for this plan."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted">
            <span className="rounded-full border border-subtle px-2 py-0.5">
              Scout Score
            </span>
            <span className="rounded-full border border-subtle px-2 py-0.5">
              Commit Probability
            </span>
            <span className="rounded-full border border-subtle px-2 py-0.5">
              Pipeline Projection
            </span>
          </div>
        </div>

        {/* Practice + scheduler placeholder */}
        <div className="rounded-xl border border-subtle bg-brand-soft p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Practice &amp; season planning
          </p>
          <p className="mt-1 text-[11px] text-muted">
            Future workspace for practices, meets, and weather-aware planning.
          </p>
          <p className="mt-3 text-[11px] text-muted">
            Status: roadmap feature (will be available to all paid program
            plans).
          </p>
        </div>
      </section>
    </>
  );
}