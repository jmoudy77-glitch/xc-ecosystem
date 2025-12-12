import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

import SeasonRosterClient from "./SeasonRosterClient";

type PageProps = {
  params: Promise<{
    programId: string;
    teamId: string;
    seasonId: string;
  }>;
};

const MANAGER_ROLES = ["head_coach", "director", "admin"] as const;

//
// SECTION 1 — Utilities
//

function formatCurrency(value: number | null, currency: string = "USD") {
  if (value === null || isNaN(value)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function computeScholarshipSummary(opts: {
  team: any;
  season: any;
  rosterRows: any[] | null;
}) {
  const budgetEquiv =
    (opts.season?.scholarship_budget_equivalents as number | null) ?? null;

  const budgetAmount =
    (opts.season?.scholarship_budget_amount as number | null) ?? null;

  let usedEquiv: number | null = null;
  let usedAmount: number | null = null;

  if (budgetEquiv !== null || budgetAmount !== null) {
    let eqSum = 0;
    let amtSum = 0;

    for (const r of opts.rosterRows || []) {
      const unit = (r.scholarship_unit as string | null) ?? "percent";
      const amt = (r.scholarship_amount as number | null) ?? 0;

      if (budgetEquiv !== null) {
        if (unit === "equivalency") eqSum += amt;
        if (unit === "percent") eqSum += amt / 100;
      }

      if (budgetAmount !== null) {
        if (unit === "amount") amtSum += amt;
      }
    }

    usedEquiv = budgetEquiv !== null ? Number(eqSum.toFixed(2)) : null;
    usedAmount = budgetAmount !== null ? Math.round(amtSum) : null;
  }

  const rawRemainingEquiv =
    budgetEquiv !== null && usedEquiv !== null
      ? Number((budgetEquiv - usedEquiv).toFixed(2))
      : null;

  const rawRemainingAmount =
    budgetAmount !== null && usedAmount !== null
      ? Math.max(0, budgetAmount - usedAmount)
      : null;

  const remainingEquiv =
    rawRemainingEquiv !== null ? Number(rawRemainingEquiv.toFixed(2)) : null;

    const remainingAmount =
    rawRemainingAmount !== null ? Math.round(rawRemainingAmount) : null;

  const hasBudget = budgetEquiv !== null || budgetAmount !== null;

    return {
      budgetEquiv,
      budgetAmount,
      usedEquiv,
      usedAmount,
      remainingEquiv,
      remainingAmount,
      hasBudget,
    };
  }

//
// SECTION 2 — Page
//

export default async function TeamSeasonPage({ params }: PageProps) {
  const { programId, teamId, seasonId } = await params;

  const supabase = await supabaseServerComponent();

  //
  // 1) Auth and viewer user
  //
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("[TeamSeasonPage] auth.getUser error:", authError);
    throw new Error("Failed to load auth user");
  }

  if (!authUser) {
    redirect("/login");
  }

  const authId = authUser.id;

  const { data: viewerRow, error: viewerError } = await supabaseAdmin
    .from("users")
    .select("id, auth_id, email")
    .eq("auth_id", authId)
    .maybeSingle();

  if (viewerError) {
    console.error("[TeamSeasonPage] viewer users error:", viewerError);
    throw new Error("Failed to load viewer user");
  }

  if (!viewerRow) {
    redirect("/dashboard");
  }

  const viewerUserId = viewerRow.id as string;

  //
  // 2) Membership & program
  //
  const { data: membership, error: membershipError } = await supabaseAdmin
    .from("program_members")
    .select(
      `
      id,
      role,
      program_id,
      programs!inner (
        id,
        name
      )
    `,
    )
    .eq("program_id", programId)
    .eq("user_id", viewerUserId)
    .maybeSingle();

  if (membershipError) {
    console.error("[TeamSeasonPage] membership error:", membershipError);
    throw new Error("Failed to load membership");
  }

  if (!membership || !membership.programs) {
    redirect("/dashboard");
  }

  const programsRel: any = (membership as any).programs;
  const programName =
    (Array.isArray(programsRel) ? programsRel[0] : programsRel)?.name ??
    "Program";

  const actingRole: string = (membership.role as string) ?? "";
  const isManager =
    !!actingRole &&
    MANAGER_ROLES.includes(actingRole.toLowerCase() as (typeof MANAGER_ROLES)[number]);

  //
  // 3) Team / season
  //
  const { data: teamRow, error: teamError } = await supabaseAdmin
    .from("teams")
    .select("id, name, gender")
    .eq("id", teamId)
    .eq("program_id", programId)
    .maybeSingle();

  if (teamError) {
    console.error("[TeamSeasonPage] teams error:", teamError);
    throw new Error("Failed to load team");
  }

  if (!teamRow) {
    redirect(`/programs/${programId}/teams`);
  }

  const teamName = (teamRow.name as string) ?? "Team";

  const { data: seasonRow, error: seasonError } = await supabaseAdmin
    .from("team_seasons")
    .select(
      `
      id,
      academic_year,
      season_label,
      season_year,
      start_date,
      end_date,
      is_current,
      is_active,
      roster_lock_date,
      scholarship_budget_equivalents,
      scholarship_budget_amount,
      scholarship_currency,
      is_locked,
      event_group_quotas,
      governing_body,
      heat_policy_id
    `,
    )
    .eq("id", seasonId)
    .eq("team_id", teamId)
    .eq("program_id", programId)
    .maybeSingle();

  if (seasonError) {
    console.error("[TeamSeasonPage] team_seasons error:", seasonError);
    throw new Error("Failed to load season");
  }

  if (!seasonRow) {
    redirect(`/programs/${programId}/teams/${teamId}`);
  }

  const seasonLabel =
    (seasonRow.season_label as string | null) ??
    (seasonRow.season_year
      ? `Season ${seasonRow.season_year}`
      : "Season");

  //
  // 4) Lock logic
  //
  const internalLock = seasonRow.is_locked === true;

  let externalLock = false;
  const today = new Date();
  if (seasonRow.roster_lock_date) {
    const lockDate = new Date(seasonRow.roster_lock_date);
    if (today >= lockDate) externalLock = true;
  }

  const finalLock = internalLock || externalLock;

  const initialGroupQuotas =
    ((seasonRow as any).event_group_quotas ??
      {}) as Record<string, number | null>;

  //
  // 5) Load roster
  //
    const { data: rosterRows, error: rosterErr } = await supabaseAdmin
    .from("team_roster")
    .select(
      `
      id,
      team_id,
      program_id,
      team_season_id,
      athlete_id,
      jersey_number,
      role,
      status,
      depth_order,
      notes,
      program_recruit_id,
      scholarship_amount,
      scholarship_unit,
      scholarship_notes,
      event_group,
      created_at,
      athletes!inner (
        id,
        first_name,
        last_name,
        grad_year,
        event_group,
        avatar_url
      ),
      team_roster_events (
        id,
        event_code,
        is_primary,
        notes
      )
    `,
    )
    .eq("team_id", teamId)
    .eq("team_season_id", seasonId)
    .order("depth_order", { ascending: true });

  if (rosterErr) {
    console.error("[TeamSeasonPage] roster error:", rosterErr);
    throw new Error("Failed to load roster");
  }

  const roster = (rosterRows ?? []).map((row: any) => {
    const athlete = row.athletes;
    const firstName = (athlete?.first_name as string) ?? "";
    const lastName = (athlete?.last_name as string) ?? "";
    const fullName = `${firstName} ${lastName}`.trim();

    return {
      // core identifiers
      id: row.id as string,
      programId,
      teamId,
      teamSeasonId: seasonId,
      athleteId: row.athlete_id as string,
      programRecruitId: (row.program_recruit_id as string | null) ?? null,

      // name / contact
      firstName,
      lastName,
      name: fullName,
      email: null as string | null, // we’re not joining to a user record here yet

      // athlete context
      gradYear: (athlete?.grad_year as number | null) ?? null,
      eventGroup: (athlete?.event_group as string | null) ?? null,

      // roster details
      jerseyNumber: (row.jersey_number as string | null) ?? null,
      role: (row.role as string | null) ?? null,
      status: (row.status as string | null) ?? null,
      depthOrder: (row.depth_order as number | null) ?? null,

      // scholarship details
      scholarshipAmount: (row.scholarship_amount as number | null) ?? null,
      scholarshipUnit: (row.scholarship_unit as string | null) ?? "percent",
      scholarshipNotes: (row.scholarship_notes as string | null) ?? null,

      // events + notes
      eventAssignments: (row.team_roster_events as any[]) ?? [],
      notes: (row.notes as string | null) ?? null,

      // extra fields required by RosterEntry
      avatarUrl: (athlete?.avatar_url as string | null) ?? null,
      createdAt: (row.created_at as string | null) ?? null,
    };
  });

  const scholarshipSummary = computeScholarshipSummary({
    team: teamRow,
    season: seasonRow,
    rosterRows,
  });

  //
  // 6) Budget history
  //
  const { data: historyRows, error: historyError } = await supabaseAdmin
    .from("season_budget_history")
    .select(
      `
        id,
        team_season_id,
        changed_by_user_id,
        old_scholarship_budget_equivalents,
        new_scholarship_budget_equivalents,
        old_scholarship_budget_amount,
        new_scholarship_budget_amount,
        created_at,
        users:users!season_budget_history_changed_by_user_id_fkey (
          id,
          email,
          name
        )
      `
    )
    .eq("team_season_id", seasonId)
    .order("created_at", { ascending: false });

  if (historyError) {
    console.error("[TeamSeasonPage] budget history error:", historyError);
    throw new Error("Failed to load budget history");
  }

  const historySummary = (historyRows ?? []).map((h: any) => {
    const user = h.users;
    const email = (user?.email as string | null) ?? "";
    const displayName =
      (user?.name as string | null) ??
      (email ? email.split("@")[0] : "Coach");

    return {
      id: h.id as string,
      timestamp: h.created_at as string,
      coach: displayName,
      oldEquiv: h.old_scholarship_budget_equivalents,
      newEquiv: h.new_scholarship_budget_equivalents,
      oldAmount: h.old_scholarship_budget_amount,
      newAmount: h.new_scholarship_budget_amount,
      notes: null as string | null,
    };
  });

  //
  // 7) Render inside ProgramLayout shell
  //
  return (
    <div className="space-y-4">
      {/* Header / context card */}
      <section className="rounded-xl border border-subtle bg-brand-soft p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] text-muted">
              <Link href="/dashboard" className="hover:underline">
                Dashboard
              </Link>
              <span>›</span>
              <Link
                href={`/programs/${programId}`}
                className="hover:underline"
              >
                {programName}
              </Link>
              <span>›</span>
              <Link
                href={`/programs/${programId}/teams`}
                className="hover:underline"
              >
                Teams &amp; rosters
              </Link>
              <span>›</span>
              <Link
                href={`/programs/${programId}/teams/${teamId}`}
                className="hover:underline"
              >
                {teamName}
              </Link>
              <span>›</span>
              <span>{seasonLabel}</span>
            </div>

            <h1 className="mt-1 text-sm font-semibold text-slate-100">
              {teamName} — {seasonLabel}
            </h1>
            <p className="mt-1 text-[11px] text-muted">
              Official roster and scholarship allocations for this season.
            </p>
          </div>

          {/* Lock status summary */}
          <div className="text-right text-[11px] text-muted">
            {externalLock ? (
              <p>
                Roster Status:{" "}
                <span className="font-semibold text-rose-300">
                  Locked by governing body
                </span>
              </p>
            ) : internalLock ? (
              <p>
                Roster Status:{" "}
                <span className="font-semibold text-amber-300">
                  Locked by coach
                </span>
              </p>
            ) : (
              <p>
                Roster Status:{" "}
                <span className="font-semibold text-emerald-300">
                  Open
                </span>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Optional lock date notice */}
      {seasonRow.roster_lock_date && (
        <section className="rounded-lg border border-subtle bg-surface p-3 text-[12px]">
          <p className="text-slate-300">
            <span className="font-semibold text-slate-100">
              Governing body lock date:
            </span>{" "}
            {new Date(seasonRow.roster_lock_date).toLocaleDateString()}
          </p>

          {externalLock && (
            <p className="mt-1 text-rose-400">
              This season is permanently locked by association rules.
            </p>
          )}
        </section>
      )}

      {/* Roster + scholarship workspace */}
      <section className="rounded-xl border border-subtle bg-surface p-4">
        <SeasonRosterClient
          programId={programId}
          teamId={teamId}
          seasonId={seasonId}
          isManager={isManager}
          isLocked={finalLock}
          teamGender={teamRow.gender ?? null}
          initialGroupQuotas={initialGroupQuotas}
          roster={roster}
          scholarshipSummary={scholarshipSummary}
          budgetHistory={historySummary}
          initialBudgetEquiv={seasonRow.scholarship_budget_equivalents ?? null}
          initialBudgetAmount={seasonRow.scholarship_budget_amount ?? null}
          budgetCurrency={seasonRow.scholarship_currency ?? "USD"}
          initialSeasonLocked={internalLock}
        />
      </section>
    </div>
  );
}