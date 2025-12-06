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
    maximumFractionDigits: 0
  }).format(value);
}

function computeScholarshipSummary(opts: {
  team: any;
  season: any;
  rosterRows: any[] | null;
}) {
  const budgetEquiv =
    (opts.season?.scholarship_budget_equivalents as number | null) ??
    null;

  const budgetAmount =
    (opts.season?.scholarship_budget_amount as number | null) ?? null;

  let usedEquiv: number | null = null;
  let usedAmount: number | null = null;

  if (budgetEquiv !== null || budgetAmount !== null) {
    let eqSum = 0;
    let amtSum = 0;

    for (const row of opts.rosterRows ?? []) {
      const amt = row.scholarship_amount as number | null;
      if (!amt) continue;

      const unit = row.scholarship_unit ?? "percent";

      // equivalency / percent logic
      if (budgetEquiv !== null) {
        if (unit === "percent") eqSum += amt / 100;
        else if (unit === "equivalency") eqSum += amt;
      }

      // amount (dollars)
      if (budgetAmount !== null) {
        if (unit === "amount") amtSum += amt;
      }
    }

    usedEquiv = budgetEquiv !== null ? Number(eqSum.toFixed(2)) : null;
    usedAmount = budgetAmount !== null ? Math.round(amtSum) : null;
  }

  return {
    budgetEquiv,
    usedEquiv,
    remainingEquiv:
      budgetEquiv !== null && usedEquiv !== null
        ? Number((budgetEquiv - usedEquiv).toFixed(2))
        : null,

    budgetAmount,
    usedAmount,
    remainingAmount:
      budgetAmount !== null && usedAmount !== null
        ? Math.max(budgetAmount - usedAmount, 0)
        : null,

    hasBudget: budgetEquiv !== null || budgetAmount !== null
  };
}

//
// SECTION 2 — MAIN PAGE
//

export default async function SeasonRosterPage({ params }: PageProps) {
  const { programId, teamId, seasonId } = await params;

  const supabase = await supabaseServerComponent();

  //
  // AUTH
  //
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) console.warn("Auth error:", authErr.message);
  const user = auth?.user;
  if (!user) redirect("/login");

  // Load viewer user row
  const { data: viewerRow, error: viewerErr } = await supabaseAdmin
    .from("users")
    .select("id, email")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!viewerRow) redirect("/dashboard");

  //
  // PROGRAM MEMBERSHIP
  //
  const { data: membership, error: membershipErr } = await supabaseAdmin
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
      `
    )
    .eq("program_id", programId)
    .eq("user_id", viewerRow.id)
    .maybeSingle();

  if (membershipErr) {
    console.error("[SeasonRoster] membership error:", membershipErr);
    throw new Error("Failed to load program membership");
  }

  if (!membership) {
    redirect("/dashboard");
  }

  const programsRel: any = (membership as any).programs;
  const programName =
    (Array.isArray(programsRel) ? programsRel[0] : programsRel)?.name ??
    "Program";

  const actingRole: string = (membership.role as string) ?? "";
  const isManager = !!actingRole &&
    MANAGER_ROLES.includes(actingRole.toLowerCase() as any);

  //
  // TEAM
  //
  const { data: teamRow, error: teamErr } = await supabaseAdmin
    .from("teams")
    .select("id, name, code, sport, gender, level")
    .eq("id", teamId)
    .maybeSingle();

  if (!teamRow) redirect(`/programs/${programId}/teams`);
  const teamName = teamRow.name;

  //
  // SEASON — includes both internal lock + external lock
  //
  const { data: seasonRow, error: seasonErr } = await supabaseAdmin
    .from("team_seasons")
    .select(
      `
        id,
        team_id,
        program_id,
        academic_year,
        year_start,
        year_end,
        season_label,
        season_year,
        start_date,
        end_date,
        roster_lock_date,
        is_locked,
        scholarship_budget_equivalents,
        scholarship_budget_amount,
        scholarship_currency,
        event_group_quotas
      `
    )
    .eq("id", seasonId)
    .eq("team_id", teamId)
    .eq("program_id", programId)
    .maybeSingle();

  if (seasonErr) {
    console.error("[SeasonRoster] season error:", seasonErr, {
      seasonId,
      teamId,
      programId,
    });
    throw new Error("Failed to load season");
  }

  if (!seasonRow) {
    console.error("[SeasonRoster] no season found for", {
      seasonId,
      teamId,
      programId,
    });
    throw new Error("Season not found");
  }

  const seasonLabel =
    seasonRow.season_label ??
    (seasonRow.season_year
      ? `Season ${seasonRow.season_year}`
      : "Season");

  //
  // LOCK LOGIC
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
    ((seasonRow as any).event_group_quotas ?? {}) as Record<string, number | null>;

  //
  // LOAD ROSTER
  //
  const { data: rosterRows, error: rosterErr } = await supabaseAdmin
    .from("team_roster")
    .select(
      `
        id,
        team_season_id,
        athlete_id,
        program_recruit_id,
        status,
        role,
        event_group,
        scholarship_amount,
        scholarship_unit,
        scholarship_notes,
        created_at,
        athletes ( first_name, last_name, grad_year )
      `
    )
    .eq("team_season_id", seasonId)
    .order("created_at", { ascending: true });

  // Load specific events per roster row
  let eventsByRosterId: Record<
    string,
    { team_roster_id: string; event_code: string; is_primary: boolean }[]
  > = {};

  const rosterIds = (rosterRows ?? []).map((r: any) => r.id as string);

  if (rosterIds.length > 0) {
    const { data: eventRows, error: eventErr } = await supabaseAdmin
      .from("team_roster_events")
      .select("team_roster_id, event_code, is_primary")
      .in("team_roster_id", rosterIds);

    if (eventErr) {
      console.error("[SeasonRoster] events load error:", eventErr);
    } else {
      for (const ev of eventRows ?? []) {
        const key = ev.team_roster_id as string;
        if (!eventsByRosterId[key]) eventsByRosterId[key] = [];
        eventsByRosterId[key].push(ev as any);
      }
    }
  }

  //
  // MAP ROSTER FOR CLIENT
  //
  const roster = (rosterRows ?? []).map((row) => {
    const a = Array.isArray(row.athletes)
      ? row.athletes[0]
      : row.athletes;

    const fullName =
      [a?.first_name, a?.last_name].filter(Boolean).join(" ") ||
      "Athlete";

    const rowEvents = eventsByRosterId[row.id as string] ?? [];

    return {
      id: row.id,
      teamSeasonId: row.team_season_id,
      athleteId: row.athlete_id,
      programRecruitId: row.program_recruit_id,
      status: row.status,
      role: row.role,

      name: fullName,
      email: null,
      avatarUrl: null,

      gradYear: a?.grad_year ?? null,
      scholarshipAmount: row.scholarship_amount,
      scholarshipUnit: row.scholarship_unit,
      scholarshipNotes: row.scholarship_notes,
      createdAt: row.created_at,
      eventGroup: (row.event_group as string | null) ?? null,
      events: rowEvents.map((ev) => ({
        eventCode: ev.event_code as string,
        isPrimary: !!ev.is_primary,
      })),
    };
  });

  //
  // SCHOLARSHIP SUMMARY
  //
  const scholarshipSummary = computeScholarshipSummary({
    team: teamRow,
    season: seasonRow,
    rosterRows
  });

  //
  // LOAD BUDGET HISTORY — last 5 for summary card
  //
  const { data: historyRows } = await supabaseAdmin
    .from("season_budget_history")
    .select(
      `
        id,
        team_season_id,
        changed_by_user_id,
        old_equiv,
        new_equiv,
        old_amount,
        new_amount,
        notes,
        created_at,
        users:users!changed_by_user_id ( first_name, last_name ),
        program_members ( role )
      `
    )
    .eq("team_season_id", seasonId)
    .order("created_at", { ascending: false })
    .limit(5);
      //
  // FORMAT HISTORY FOR SUMMARY CARD
  //
  const historySummary = (historyRows ?? []).map((h) => {
    const userRecord = Array.isArray(h.users) ? h.users[0] : h.users;
    const coachName =
      userRecord?.first_name && userRecord?.last_name
        ? `${userRecord.first_name} ${userRecord.last_name}`
        : "Unknown";

    const roleRecord = Array.isArray(h.program_members) ? h.program_members[0] : h.program_members;
    const role = roleRecord?.role
      ? ` (${roleRecord.role.replace("_", " ")})`
      : "";

    return {
      id: h.id,
      timestamp: h.created_at,
      coach: coachName + role,
      oldEquiv: h.old_equiv,
      newEquiv: h.new_equiv,
      oldAmount: h.old_amount,
      newAmount: h.new_amount,
      notes: h.notes
    };
  });

  //
  // RENDER
  //
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-[90vw] px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <Link href="/dashboard" className="hover:text-slate-200">
                  Dashboard
                </Link>
                <span>›</span>

                <Link
                  href={`/programs/${programId}`}
                  className="hover:text-slate-200"
                >
                  {programName}
                </Link>

                <span>›</span>
                <Link
                  href={`/programs/${programId}/teams`}
                  className="hover:text-slate-200"
                >
                  Teams &amp; Rosters
                </Link>

                <span>›</span>
                <Link
                  href={`/programs/${programId}/teams/${teamId}`}
                  className="hover:text-slate-200"
                >
                  {teamName}
                </Link>

                <span>›</span>
                <span>{seasonLabel}</span>
              </div>

              <h1 className="mt-1 text-base font-semibold text-slate-100">
                {teamName} — {seasonLabel}
              </h1>

              <p className="mt-1 text-[11px] text-slate-500">
                Official roster and scholarship allocations for this season.
              </p>
            </div>

            {/* LOCK STATUS INDICATOR */}
            <div className="text-right text-[11px] text-slate-400">
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
        </div>
      </header>

      <main className="px-4 py-6">
        <div className="mx-auto w-[98%] space-y-6">
          {/* GOVERNING BODY LOCK DATE */}
          {seasonRow.roster_lock_date && (
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-[12px]">
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
            </div>
          )}

          {/* MAIN COLUMN LAYOUT */}
          <div className="space-y-6">
            {/* ROSTER SECTION */}
            <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Season Roster
              </p>

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
        </div>
      </main>
    </div>
  );
}