import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

import SeasonRosterClient from "./SeasonRosterClient";
import SeasonBudgetControls from "./SeasonBudgetControls";
import ScholarshipWhatIf from "./ScholarshipWhatIf";

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

  if (!seasonRow) redirect(`/programs/${programId}/teams/${teamId}`);

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
        scholarship_amount,
        scholarship_unit,
        scholarship_notes,
        created_at,
        athletes ( first_name, last_name, grad_year )
      `
    )
    .eq("team_season_id", seasonId)
    .order("created_at", { ascending: true });

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
      eventGroup: (row.role as string | null) ?? null
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
        <div className="mx-auto max-w-6xl px-4 py-4">
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

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
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

        {/* MAIN GRID LAYOUT */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* LEFT COLUMN: SUMMARY + CONTROLS + ROSTER */}
          <div className="space-y-6 lg:col-span-2">
            {/* SCHOLARSHIP SUMMARY CARD */}
            {scholarshipSummary.hasBudget && (
              <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Scholarship Summary
                </p>

                {/* EQUIVALENCY SUMMARY */}
                {scholarshipSummary.budgetEquiv !== null && (
                  <p className="mt-1 text-sm text-slate-100">
                    Equivalency Budget:{" "}
                    <span className="font-bold">
                      {scholarshipSummary.budgetEquiv.toFixed(2)} eq
                    </span>
                    {"  "}
                    • Committed:{" "}
                    <span
                      className={
                        (scholarshipSummary.usedEquiv ?? 0) >
                        (scholarshipSummary.budgetEquiv ?? 0)
                          ? "text-rose-300 font-semibold"
                          : "text-emerald-300 font-semibold"
                      }
                    >
                      {(scholarshipSummary.usedEquiv ?? 0).toFixed(2)} eq
                    </span>
                    {"  "}
                    • Remaining:{" "}
                    <span className="font-semibold text-slate-200">
                      {scholarshipSummary.remainingEquiv?.toFixed(2)}
                    </span>
                  </p>
                )}

                {/* AMOUNT SUMMARY */}
                {scholarshipSummary.budgetAmount !== null && (
                  <p className="mt-1 text-sm text-slate-100">
                    Dollar Budget:{" "}
                    <span className="font-bold">
                      {formatCurrency(scholarshipSummary.budgetAmount)}
                    </span>
                    {"  "}
                    • Committed:{" "}
                    <span
                      className={
                        (scholarshipSummary.usedAmount ?? 0) >
                        (scholarshipSummary.budgetAmount ?? 0)
                          ? "text-rose-300 font-semibold"
                          : "text-emerald-300 font-semibold"
                      }
                    >
                      {formatCurrency(scholarshipSummary.usedAmount ?? 0)}
                    </span>
                    {"  "}
                    • Remaining:{" "}
                    <span className="font-semibold">
                      {formatCurrency(scholarshipSummary.remainingAmount)}
                    </span>
                  </p>
                )}

                {/* What-if Calculator */}
                <div className="mt-4">
                  <ScholarshipWhatIf
                    budgetEquiv={scholarshipSummary.budgetEquiv}
                    budgetAmount={scholarshipSummary.budgetAmount}
                    usedEquiv={scholarshipSummary.usedEquiv}
                    usedAmount={scholarshipSummary.usedAmount}
                    currency={seasonRow.scholarship_currency}
                  />
                </div>
              </section>
            )}

            {/* BUDGET CONTROLS & LOCKING */}
            <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Season Budget Controls
              </p>

              {/* LOCK MESSAGING */}
              {externalLock ? (
                <div className="mb-3 rounded-md border border-rose-500/40 bg-rose-900/40 p-2 text-[12px] text-rose-200">
                  <p className="font-semibold">
                    This season is locked by the governing body.
                  </p>
                  <p className="text-[11px]">
                    No scholarship or budget changes may be made after{" "}
                    <span className="font-semibold">
                      {new Date(seasonRow.roster_lock_date).toLocaleDateString()}
                    </span>
                    .
                  </p>
                </div>
              ) : internalLock ? (
                <div className="mb-3 rounded-md border border-amber-500/40 bg-amber-900/30 p-2 text-[12px] text-amber-200">
                  <p className="font-semibold">
                    This season is locked by the head coach.
                  </p>
                  <p className="text-[11px]">
                    Unlock the season to make further changes.
                  </p>
                </div>
              ) : (
                <div className="mb-3 rounded-md border border-emerald-500/40 bg-emerald-900/30 p-2 text-[12px] text-emerald-200">
                  <p className="font-semibold">Season is open for editing.</p>
                  <p className="text-[11px]">
                    You may adjust scholarships and season budgets.
                  </p>
                </div>
              )}

              {/* BUDGET CONTROLS COMPONENT */}
              <SeasonBudgetControls
                programId={programId}
                teamId={teamId}
                seasonId={seasonId}
                initialEquiv={seasonRow.scholarship_budget_equivalents}
                initialAmount={seasonRow.scholarship_budget_amount}
                currency={seasonRow.scholarship_currency ?? "USD"}
                initialIsLocked={internalLock}
              />
            </section>

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
              />
            </section>
          </div>

          {/* RIGHT COLUMN: HISTORY, ANALYTICS, ETC. */}
          <div className="space-y-6">
            {/* BUDGET HISTORY SUMMARY (TOP 5) */}
            {historySummary.length > 0 && (
              <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Recent Scholarship Budget Changes
                  </p>

                  <div className="flex items-center gap-3">
                    <Link
                      href={`/programs/${programId}/teams/${teamId}/seasons/${seasonId}/scholarship-history`}
                      className="text-[11px] text-sky-300 hover:underline"
                    >
                      View Full History
                    </Link>

                    <Link
                      href={`/api/programs/${programId}/teams/${teamId}/seasons/${seasonId}/scholarship-history/export`}
                      className="rounded-md border border-sky-600 bg-sky-900/40 px-2 py-1 text-[10px] text-sky-200 hover:bg-sky-800/60"
                    >
                      Export CSV
                    </Link>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {historySummary.map((h) => {
                    const eqDiff =
                      h.newEquiv !== null && h.oldEquiv !== null
                        ? Number(h.newEquiv - h.oldEquiv)
                        : null;

                    const amtDiff =
                      h.newAmount !== null && h.oldAmount !== null
                        ? Number(h.newAmount - h.oldAmount)
                        : null;

                    return (
                      <div
                        key={h.id}
                        className="rounded-md border border-slate-800 bg-slate-950/50 p-2 text-[12px]"
                      >
                        <p className="text-slate-300">
                          <span className="font-semibold text-slate-100">
                            {new Date(h.timestamp).toLocaleString()}
                          </span>{" "}
                          — {h.coach}
                        </p>

                        <div className="mt-1 grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-slate-400">Equiv: </span>
                            {h.oldEquiv} → {h.newEquiv}{" "}
                            {eqDiff !== null && (
                              <span
                                className={
                                  eqDiff > 0
                                    ? "text-emerald-300"
                                    : eqDiff < 0
                                    ? "text-rose-300"
                                    : "text-slate-400"
                                }
                              >
                                ({eqDiff > 0 ? "+" : ""}
                                {eqDiff})
                              </span>
                            )}
                          </div>

                          <div>
                            <span className="text-slate-400">Amount: </span>
                            {formatCurrency(h.oldAmount)} →{" "}
                            {formatCurrency(h.newAmount)}{" "}
                            {amtDiff !== null && (
                              <span
                                className={
                                  amtDiff > 0
                                    ? "text-emerald-300"
                                    : amtDiff < 0
                                    ? "text-rose-300"
                                    : "text-slate-400"
                                }
                              >
                                ({amtDiff > 0 ? "+" : ""}
                                {formatCurrency(amtDiff)})
                              </span>
                            )}
                          </div>
                        </div>

                        {h.notes && (
                          <p className="mt-1 text-[10px] text-slate-500 italic">
                            Notes: {h.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}