// app/programs/[programId]/teams/[teamId]/scenarios/[scenarioId]/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import ScenarioEntriesClient from "./ScenarioEntriesClient";

type PageProps = {
  params: Promise<{
    programId: string;
    teamId: string;
    scenarioId: string;
  }>;
};

type ScenarioEntry = {
  id: string;
  athleteId: string | null;
  programRecruitId: string | null;
  athleteName: string;
  gradYear: number | null;
  scholarshipAmount: number | null;
  scholarshipUnit: string;
  scholarshipNotes: string | null;
  createdAt: string | null;
};

export default async function ScenarioPage({ params }: PageProps) {
  const { programId, teamId, scenarioId } = await params;

  const supabase = await supabaseServerComponent();

  // ---- Auth ----
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const authId = authUser.id;

  // ---- Ensure user row ----
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id, auth_id")
    .eq("auth_id", authId)
    .maybeSingle();

  if (!userRow) {
    redirect("/dashboard");
  }

  const viewerUserId = userRow.id as string;

  // ---- Ensure membership in this program ----
  const { data: membership } = await supabaseAdmin
    .from("program_members")
    .select("id")
    .eq("program_id", programId)
    .eq("user_id", viewerUserId)
    .maybeSingle();

  if (!membership) {
    redirect("/dashboard");
  }

  // ---- Load team (for name + scholarship budget) ----
  const { data: teamRow, error: teamError } = await supabaseAdmin
    .from("teams")
    .select("id, name, scholarship_budget, scholarship_unit")
    .eq("id", teamId)
    .eq("program_id", programId)
    .maybeSingle();

  if (teamError) {
    console.error("[RosterScenario] team error:", teamError);
    throw new Error("Failed to load team");
  }

  if (!teamRow) {
    redirect(`/programs/${programId}/teams`);
  }

  const teamName = (teamRow.name as string) ?? "Team";
  const scholarshipBudget =
    (teamRow as any).scholarship_budget !== null &&
    (teamRow as any).scholarship_budget !== undefined
      ? Number((teamRow as any).scholarship_budget)
      : null;
  const scholarshipUnit =
    ((teamRow as any).scholarship_unit as string | null) ?? "equivalency";

  // ---- Load scenario ----
  const { data: scenarioRow, error: scenarioError } = await supabaseAdmin
    .from("roster_scenarios")
    .select(
      `
      id,
      program_id,
      team_id,
      name,
      target_season_label,
      target_season_year,
      notes,
      created_at
    `
    )
    .eq("id", scenarioId)
    .maybeSingle();

  if (scenarioError) {
    console.error("[RosterScenario] scenario error:", scenarioError);
    throw new Error("Failed to load scenario");
  }

  if (
    !scenarioRow ||
    (scenarioRow.program_id as string) !== programId ||
    (scenarioRow.team_id as string) !== teamId
  ) {
    redirect(`/programs/${programId}/teams/${teamId}`);
  }

  const name = (scenarioRow.name as string) ?? "Scenario";
  const targetLabel =
    (scenarioRow.target_season_label as string | null) ??
    (scenarioRow.target_season_year
      ? `Season ${scenarioRow.target_season_year}`
      : null);

  // ---- Load scenario entries (for scholarship summary) ----
  const { data: entryRows, error: entriesError } = await supabaseAdmin
    .from("roster_scenario_entries")
    .select(
      `
      id,
      scenario_id,
      athlete_id,
      program_recruit_id,
      scholarship_amount,
      scholarship_unit,
      scholarship_notes,
      created_at,
      athlete:athletes!left (
        id,
        first_name,
        last_name,
        grad_year
      )
    `
    )
    .eq("scenario_id", scenarioId)
    .order("created_at", { ascending: true });

  if (entriesError) {
    console.error("[RosterScenario] entries error:", entriesError);
    throw new Error("Failed to load scenario entries");
  }

  const entries: ScenarioEntry[] = (entryRows ?? []).map((row: any) => {
    const athleteRel = row.athlete;
    const athleteRecord = Array.isArray(athleteRel)
      ? athleteRel[0]
      : athleteRel;

    const firstName = (athleteRecord?.first_name as string | null) ?? "";
    const lastName = (athleteRecord?.last_name as string | null) ?? "";
    const fullName =
      (firstName || lastName
        ? `${firstName} ${lastName}`.trim()
        : "Unnamed athlete") ?? "Unnamed athlete";

    return {
      id: row.id as string,
      athleteId: (row.athlete_id as string | null) ?? null,
      programRecruitId: (row.program_recruit_id as string | null) ?? null,
      athleteName: fullName,
      gradYear: (athleteRecord?.grad_year as number | null) ?? null,
      scholarshipAmount:
        row.scholarship_amount !== null &&
        row.scholarship_amount !== undefined
          ? Number(row.scholarship_amount)
          : null,
      scholarshipUnit:
        (row.scholarship_unit as string | null) ?? scholarshipUnit,
      scholarshipNotes: (row.scholarship_notes as string | null) ?? null,
      createdAt: (row.created_at as string | null) ?? null,
    };
  });

  // ---- Scholarship summary calculations ----
  const totalScenarioScholarship = entries.reduce((sum, entry) => {
    if (entry.scholarshipAmount == null) return sum;
    return sum + entry.scholarshipAmount;
  }, 0);

  const hasBudget =
    scholarshipBudget !== null && !Number.isNaN(scholarshipBudget);
  const remaining =
    hasBudget && scholarshipBudget !== null
      ? scholarshipBudget - totalScenarioScholarship
      : null;

  const pctUsed =
    hasBudget && scholarshipBudget && scholarshipBudget > 0
      ? (totalScenarioScholarship / scholarshipBudget) * 100
      : null;

  const unitLabel =
    scholarshipUnit === "percent"
      ? "%"
      : scholarshipUnit === "amount"
      ? ""
      : "equivalencies";

  const formattedTotal = totalScenarioScholarship.toFixed(
    scholarshipUnit === "percent" ? 1 : 2
  );
  const formattedBudget =
    hasBudget && scholarshipBudget !== null
      ? scholarshipBudget.toFixed(
          scholarshipUnit === "percent" ? 1 : 2
        )
      : null;
  const formattedRemaining =
    remaining !== null
      ? remaining.toFixed(scholarshipUnit === "percent" ? 1 : 2)
      : null;

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
                  Program
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
                <span>Roster scenario</span>
              </div>
              <h1 className="mt-1 text-base font-semibold text-slate-100">
                {name}
              </h1>
              {targetLabel && (
                <p className="mt-1 text-[11px] text-slate-400">
                  Target: {targetLabel}
                </p>
              )}
            </div>
            <Link
              href={`/programs/${programId}/teams/${teamId}`}
              className="rounded-full border border-slate-600 bg-slate-900/80 px-3 py-1.5 text-[11px] text-slate-100 hover:border-slate-300"
            >
              ← Back to team
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        {/* Scenario overview */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Scenario overview
          </p>
          <p className="mt-2 text-sm text-slate-200">
            This is a sandbox scenario for planning future rosters. Changes here
            do not affect your official season rosters.
          </p>
          {scenarioRow.notes && (
            <p className="mt-3 whitespace-pre-wrap text-[11px] text-slate-300">
              {scenarioRow.notes}
            </p>
          )}
        </section>

        {/* Scholarship summary */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Scholarship snapshot (scenario)
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Based on scholarship amounts assigned to athletes in this
                scenario only.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 text-right text-xs">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                  Total in scenario
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-50">
                  {formattedTotal}{" "}
                  <span className="text-[10px] font-normal text-slate-400">
                    {unitLabel}
                  </span>
                </p>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                  Team budget
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-50">
                  {formattedBudget !== null ? (
                    <>
                      {formattedBudget}{" "}
                      <span className="text-[10px] font-normal text-slate-400">
                        {unitLabel}
                      </span>
                    </>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      Not set
                    </span>
                  )}
                </p>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                  Remaining
                </p>
                <p
                  className={`mt-1 text-sm font-semibold ${
                    remaining !== null && remaining < 0
                      ? "text-rose-400"
                      : "text-emerald-300"
                  }`}
                >
                  {formattedRemaining !== null ? (
                    <>
                      {formattedRemaining}{" "}
                      <span className="text-[10px] font-normal text-slate-400">
                        {unitLabel}
                      </span>
                    </>
                  ) : (
                    "—"
                  )}
                </p>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                  Used
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-50">
                  {pctUsed !== null ? `${pctUsed.toFixed(1)}%` : "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full ${
                remaining !== null && remaining < 0
                  ? "bg-rose-500"
                  : "bg-sky-500"
              }`}
              style={{
                width: `${
                  pctUsed !== null
                    ? Math.max(0, Math.min(120, pctUsed))
                    : 0
                }%`,
              }}
            />
          </div>

          <p className="mt-2 text-[10px] text-slate-500">
            {entries.length} scenario entries with scholarship values. This is a
            planning-only view and does not change your official roster or
            financial aid records.
          </p>
        </section>

                <ScenarioEntriesClient
          programId={programId}
          teamId={teamId}
          scenarioId={scenarioId}
          initialEntries={entries}
          unitLabel={unitLabel}
        />
      </main>
    </div>
  );
}