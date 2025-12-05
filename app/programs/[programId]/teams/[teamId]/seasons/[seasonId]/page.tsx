// app/programs/[programId]/teams/[teamId]/seasons/[seasonId]/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import SeasonRosterClient from "./SeasonRosterClient";
import SeasonBudgetControls from "./SeasonBudgetControls";

type PageProps = {
  params: Promise<{
    programId: string;
    teamId: string;
    seasonId: string;
  }>;
};

const MANAGER_ROLES = ["head_coach", "director", "admin"] as const;
const BUDGET_VIEWERS = ["head_coach", "director", "admin"] as const;
const BUDGET_EDITORS = ["head_coach"] as const;

type ScholarshipSummary = {
  hasBudget: boolean;
  budgetEquiv: number | null;
  usedEquiv: number | null;
  remainingEquiv: number | null;
  budgetAmount: number | null;
  usedAmount: number | null;
  remainingAmount: number | null;
  hasAnyScholarships?: boolean;
};

function computeScholarshipSummary(opts: {
  season: any;
  rosterRows: any[] | null;
}): ScholarshipSummary {
  const budgetEquivRaw =
    (opts.season?.scholarship_budget_equivalents as number | null) ?? null;

  const budgetAmountRaw =
    (opts.season?.scholarship_budget_amount as number | null) ?? null;

  const budgetEquiv = budgetEquivRaw !== null ? Number(budgetEquivRaw) : null;
  const budgetAmount =
    budgetAmountRaw !== null ? Number(budgetAmountRaw) : null;

  const hasAnyScholarships = (opts.rosterRows ?? []).some(
    (row) => row.scholarship_amount != null
  );

  let usedEquiv: number | null = null;
  let usedAmount: number | null = null;

  if (budgetEquiv !== null || budgetAmount !== null) {
    let equivSum = 0;
    let amountSum = 0;

    for (const row of opts.rosterRows ?? []) {
      const raw = row.scholarship_amount as number | null;
      if (raw == null) continue;

      const amt = Number(raw);
      const unit = (row.scholarship_unit as string | null) ?? "percent";

      // If budget is in equivalencies, treat % as fraction of 1.0 FTE
      if (budgetEquiv !== null) {
        if (unit === "percent") {
          equivSum += amt / 100;
        } else if (unit === "equivalency") {
          equivSum += amt;
        }
      }

      // If budget is in dollars, just sum the amounts
      if (budgetAmount !== null) {
        if (unit === "amount") {
          amountSum += amt;
        }
      }
    }

    usedEquiv = budgetEquiv !== null ? Number(equivSum.toFixed(2)) : null;
    usedAmount = budgetAmount !== null ? Math.round(amountSum) : null;
  }

  const remainingEquiv =
    budgetEquiv !== null && usedEquiv !== null
      ? Number((budgetEquiv - usedEquiv).toFixed(2))
      : null;

  const remainingAmount =
    budgetAmount !== null && usedAmount !== null
      ? Math.max(budgetAmount - usedAmount, 0)
      : null;

  return {
    hasBudget: budgetEquiv !== null || budgetAmount !== null,
    budgetEquiv,
    usedEquiv,
    remainingEquiv,
    budgetAmount,
    usedAmount,
    remainingAmount,
    hasAnyScholarships,
  };
}

export default async function SeasonRosterPage({ params }: PageProps) {
  const { programId, teamId, seasonId } = await params;

  const supabase = await supabaseServerComponent();

  // 1) Auth
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn("[SeasonRoster] auth.getUser error:", authError.message);
  }

  if (!authUser) {
    redirect("/login");
  }

  const authId = authUser.id;

  // 2) Ensure viewer has a users row
  const { data: userRow, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, auth_id, email")
    .eq("auth_id", authId)
    .maybeSingle();

  if (userError) {
    console.error("[SeasonRoster] users select error:", userError);
    throw new Error("Failed to load viewer user record");
  }

  if (!userRow) {
    redirect("/dashboard");
  }

  const viewerUserId = userRow.id as string;

  // 3) Membership in this program + program name
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
    `
    )
    .eq("program_id", programId)
    .eq("user_id", viewerUserId)
    .maybeSingle();

  if (membershipError) {
    console.error("[SeasonRoster] membership error:", membershipError);
    throw new Error("Failed to load program membership");
  }

  if (!membership || !membership.programs) {
    redirect("/dashboard");
  }

  const programsRel = (membership as any).programs;
  const programRecord = Array.isArray(programsRel)
    ? programsRel[0]
    : programsRel;
  const programName = (programRecord?.name as string) ?? "Program";

  const actingRole: string | null = (membership.role as string) ?? null;

  const isManager =
    actingRole !== null &&
    MANAGER_ROLES.includes(actingRole.toLowerCase() as any);

  const canViewBudget =
    actingRole !== null &&
    BUDGET_VIEWERS.includes(actingRole.toLowerCase() as any);

  const canEditBudget =
    actingRole !== null &&
    BUDGET_EDITORS.includes(actingRole.toLowerCase() as any);

  // 4) Load team
  const { data: teamRow, error: teamError } = await supabaseAdmin
    .from("teams")
    .select("id, program_id, name, code, sport, gender, level")
    .eq("id", teamId)
    .eq("program_id", programId)
    .maybeSingle();

  if (teamError) {
    console.error("[SeasonRoster] team error:", teamError);
    throw new Error("Failed to load team");
  }

  if (!teamRow) {
    redirect(`/programs/${programId}/teams`);
  }

  const teamName = (teamRow.name as string) ?? "Team";

  // 5) Load season (budget fields, no is_locked yet)
  const { data: seasonRow, error: seasonError } = await supabaseAdmin
    .from("team_seasons")
    .select(
      `
      id,
      team_id,
      season_label,
      season_year,
      scholarship_budget_equivalents,
      scholarship_budget_amount,
      scholarship_currency
    `
    )
    .eq("id", seasonId)
    .eq("team_id", teamId)
    .maybeSingle();

  if (seasonError) {
    console.error("[SeasonRoster] season error:", seasonError);
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

  // TODO: wire real lock flag once we add it to team_seasons
  const isLocked = false;

  // 6) Load roster rows (with scholarship fields)
  const { data: rosterRows, error: rosterError } = await supabaseAdmin
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
      athletes (
        id,
        first_name,
        last_name,
        grad_year
      )
    `
    )
    .eq("team_season_id", seasonId)
    .order("created_at", { ascending: true });

  if (rosterError) {
    console.error("[SeasonRoster] roster error:", rosterError);
    throw new Error("Failed to load season roster");
  }

  // 7) Map roster to client shape
  const roster = (rosterRows ?? []).map((row: any) => {
    const athleteRel = (row as any).athletes;
    const athleteRecord = Array.isArray(athleteRel) ? athleteRel[0] : athleteRel;

    const firstName = athleteRecord?.first_name as string | undefined;
    const lastName = athleteRecord?.last_name as string | undefined;
    const fullName =
      [firstName, lastName].filter(Boolean).join(" ") || "Athlete";

    return {
      id: row.id as string,
      teamSeasonId: row.team_season_id as string,
      athleteId: (row.athlete_id as string | null) ?? null,
      programRecruitId: (row.program_recruit_id as string | null) ?? null,
      status: (row.status as string | null) ?? null,
      role: (row.role as string | null) ?? null,

      // Fields expected by SeasonRosterClient
      name: fullName,
      email: null,
      avatarUrl: null,

      // Extra metadata
      athleteName: fullName,
      gradYear:
        (athleteRecord?.grad_year as number | null | undefined) ?? null,
      scholarshipAmount:
        (row.scholarship_amount as number | null) ?? null,
      scholarshipUnit:
        (row.scholarship_unit as string | null) ?? "percent",
      scholarshipNotes:
        (row.scholarship_notes as string | null) ?? null,
      createdAt: row.created_at as string | null,
    };
  });

  // 8) Scholarship summary (season-only budget)
  const scholarshipSummary = computeScholarshipSummary({
    season: seasonRow,
    rosterRows,
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
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
                  Teams &amp; rosters
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
            <div className="text-right text-[11px] text-slate-400">
              <p>
                Roster status:{" "}
                {isLocked ? (
                  <span className="font-semibold text-rose-300">
                    Locked
                  </span>
                ) : (
                  <span className="font-semibold text-emerald-300">
                    Open
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {(scholarshipSummary.hasBudget || canViewBudget) && (
          <section className="mb-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Scholarship summary
                </p>
                {!scholarshipSummary.hasBudget ? (
                  <p className="mt-1 text-xs text-slate-400">
                    No season scholarship budget has been set yet.
                    {canEditBudget && (
                      <>
                        {" "}
                        As head coach, you&apos;ll manage the{" "}
                        <span className="font-semibold">
                          season scholarship budget
                        </span>{" "}
                        from this page.
                      </>
                    )}
                  </p>
                ) : (
                  <>
                    {scholarshipSummary.budgetEquiv !== null && (
                      <p className="mt-1 text-xs text-slate-200">
                        Equivalency budget:{" "}
                        <span className="font-semibold">
                          {scholarshipSummary.budgetEquiv.toFixed(2)} eq
                        </span>
                        {scholarshipSummary.usedEquiv !== null && (
                          <>
                            {" "}
                            • Committed{" "}
                            <span className="font-semibold">
                              {scholarshipSummary.usedEquiv.toFixed(2)} eq
                            </span>
                            {scholarshipSummary.remainingEquiv !== null && (
                              <>
                                {" "}
                                • Remaining{" "}
                                <span className="font-semibold">
                                  {scholarshipSummary.remainingEquiv.toFixed(
                                    2
                                  )}{" "}
                                  eq
                                </span>
                              </>
                            )}
                          </>
                        )}
                      </p>
                    )}

                    {scholarshipSummary.budgetAmount !== null && (
                      <p className="mt-1 text-[11px] text-slate-200">
                        Budget:{" "}
                        <span className="font-semibold">
                          $
                          {scholarshipSummary.budgetAmount.toLocaleString(
                            undefined,
                            { maximumFractionDigits: 0 }
                          )}
                        </span>
                        {scholarshipSummary.usedAmount !== null && (
                          <>
                            {" "}
                            • Committed{" "}
                            <span className="font-semibold">
                              $
                              {scholarshipSummary.usedAmount.toLocaleString(
                                undefined,
                                { maximumFractionDigits: 0 }
                              )}
                            </span>
                            {scholarshipSummary.remainingAmount !== null && (
                              <>
                                {" "}
                                • Remaining{" "}
                                <span className="font-semibold">
                                  $
                                  {scholarshipSummary.remainingAmount.toLocaleString(
                                    undefined,
                                    { maximumFractionDigits: 0 }
                                  )}
                                </span>
                              </>
                            )}
                          </>
                        )}
                      </p>
                    )}
                  </>
                )}

                {scholarshipSummary.hasAnyScholarships &&
                  !scholarshipSummary.hasBudget && (
                    <p className="mt-1 text-[11px] text-amber-300/80">
                      Scholarships are being assigned to athletes, but no
                      overall season budget has been defined yet.
                    </p>
                  )}
              </div>

              {scholarshipSummary.hasBudget && (
  <div className="w-full max-w-xs space-y-3">
    {scholarshipSummary.budgetEquiv !== null &&
      scholarshipSummary.usedEquiv !== null && (
        <div>
          <div className="mb-1 flex items-center justify-between text-[10px] text-slate-400">
            <span>Equivalencies used</span>
            <span>
              {scholarshipSummary.usedEquiv.toFixed(2)} /{" "}
              {scholarshipSummary.budgetEquiv.toFixed(2)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full ${
                scholarshipSummary.usedEquiv >
                (scholarshipSummary.budgetEquiv ?? 0)
                  ? "bg-rose-500"
                  : "bg-emerald-500"
              }`}
              style={{
                width: `${
                  Math.min(
                    (scholarshipSummary.usedEquiv /
                      (scholarshipSummary.budgetEquiv || 1)) *
                      100,
                    120
                  ) || 0
                }%`,
              }}
            />
          </div>
        </div>
      )}

      {scholarshipSummary.budgetAmount !== null &&
        scholarshipSummary.usedAmount !== null && (
          <div>
            <div className="mb-1 flex items-center justify-between text-[10px] text-slate-400">
              <span>Budget used ({(seasonRow.scholarship_currency as string | null) ?? "USD"})</span>
              <span>
                $
                {scholarshipSummary.usedAmount.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}{" "}
                / $
                {scholarshipSummary.budgetAmount.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full ${
                  scholarshipSummary.usedAmount >
                  (scholarshipSummary.budgetAmount ?? 0)
                    ? "bg-rose-500"
                    : "bg-emerald-500"
                }`}
                style={{
                  width: `${
                    Math.min(
                      (scholarshipSummary.usedAmount /
                        (scholarshipSummary.budgetAmount || 1)) *
                        100,
                      120
                    ) || 0
                  }%`,
                }}
              />
            </div>
          </div>
        )}
    </div>
  )}
                  {canEditBudget && (
                    <div className="ml-auto">
                      <SeasonBudgetControls
                        programId={programId}
                        teamId={teamId}
                        seasonId={seasonId}
                        initialEquiv={scholarshipSummary.budgetEquiv}
                        initialAmount={scholarshipSummary.budgetAmount}
                        currency={(seasonRow.scholarship_currency as string | null) ?? "USD"}
                      />
                    </div>
                  )}
            </div>
          </section>
        )}

        <SeasonRosterClient
          programId={programId}
          teamId={teamId}
          seasonId={seasonId}
          isManager={isManager}
          isLocked={isLocked}
          roster={roster}
        />
      </main>
    </div>
  );
}