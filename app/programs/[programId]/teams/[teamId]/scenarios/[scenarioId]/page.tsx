import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import ScenarioRosterClient from "./ScenarioRosterClient";

type PageProps = {
  params: Promise<{
    programId: string;
    teamId: string;
    scenarioId: string;
  }>;
  searchParams?: Promise<{ view?: string }>;
};

type ScenarioEntry = {
  id: string;
  athleteId: string | null;
  programRecruitId: string | null;
  eventGroup: string | null;
  name: string;
  gradYear: number | null;
  scholarshipAmount: number | null;
  scholarshipUnit: string;
  scholarshipNotes: string | null;
  createdAt: string | null;
};

export default async function ScenarioPage({ params, searchParams }: PageProps) {
  const { programId, teamId, scenarioId } = await params;
  const sp = (await searchParams) ?? {};
  const view = (sp.view ?? "").toString();
  const isCardsView = view === "cards";

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
    .select("id, role")
    .eq("program_id", programId)
    .eq("user_id", viewerUserId)
    .maybeSingle();

  if (!membership) {
    redirect("/dashboard");
  }

  const membershipRole = (membership as any).role as string | null;
  const isManager =
    membershipRole === "owner" ||
    membershipRole === "admin" ||
    membershipRole === "manager" ||
    membershipRole === "head_coach" ||
    membershipRole === "coach";

  const isElevated =
    membershipRole === "owner" ||
    membershipRole === "admin" ||
    membershipRole === "head_coach";

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
      status,
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

  type ScenarioStatus = "draft" | "candidate" | "active";
  const rawStatus = (scenarioRow as any).status as string | null;
  const scenarioStatus: ScenarioStatus =
    rawStatus === "active" || rawStatus === "candidate" || rawStatus === "draft"
      ? (rawStatus as ScenarioStatus)
      : "draft";

  const statusLabel =
    scenarioStatus === "active"
      ? "Active"
      : scenarioStatus === "candidate"
      ? "Candidate"
      : "Draft";

  const statusIcon =
    scenarioStatus === "active" ? "👑" : scenarioStatus === "candidate" ? "⭐" : "";

  async function actionSetScenarioStatus(next: "draft" | "candidate" | "active") {
    "use server";

    // Re-check permissions server-side
    if (!membershipRole) {
      throw new Error("Not authorized");
    }

    const canManage =
      membershipRole === "owner" ||
      membershipRole === "admin" ||
      membershipRole === "manager" ||
      membershipRole === "head_coach" ||
      membershipRole === "coach";

    const canPromote =
      membershipRole === "owner" || membershipRole === "admin" || membershipRole === "head_coach";

    if (!canManage) {
      throw new Error("Not authorized");
    }

    if (next === "active" && !canPromote) {
      throw new Error("Not authorized to promote");
    }

    // Enforce one active per (program_id, team_id)
    if (next === "active") {
      const { error: demoteError } = await supabaseAdmin
        .from("roster_scenarios")
        .update({ status: "candidate" })
        .eq("program_id", programId)
        .eq("team_id", teamId)
        .eq("status", "active");

      if (demoteError) {
        console.error("[RosterScenario] demote active error:", demoteError);
        throw new Error("Failed to promote scenario");
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from("roster_scenarios")
      .update({ status: next })
      .eq("id", scenarioId)
      .eq("program_id", programId)
      .eq("team_id", teamId);

    if (updateError) {
      console.error("[RosterScenario] status update error:", updateError);
      throw new Error("Failed to update scenario status");
    }

    revalidatePath(`/programs/${programId}/teams/${teamId}/scenarios/${scenarioId}`);
  }

  async function actionReturnToPlanning() {
    "use server";

    if (!membershipRole) {
      throw new Error("Not authorized");
    }

    const canPromote =
      membershipRole === "owner" || membershipRole === "admin" || membershipRole === "head_coach";

    if (!canPromote) {
      throw new Error("Not authorized");
    }

    const { error } = await supabaseAdmin
      .from("roster_scenarios")
      .update({ status: "candidate" })
      .eq("id", scenarioId)
      .eq("program_id", programId)
      .eq("team_id", teamId);

    if (error) {
      console.error("[RosterScenario] return to planning error:", error);
      throw new Error("Failed to return to planning");
    }

    revalidatePath(`/programs/${programId}/teams/${teamId}/scenarios/${scenarioId}`);
  }

  // ---- Load scenario entries (for scholarship summary) ----
  const { data: entryRows, error: entriesError } = await supabaseAdmin
    .from("roster_scenario_entries")
    .select(
      `
      id,
      scenario_id,
      athlete_id,
      program_recruit_id,
      event_group,
      scholarship_amount,
      scholarship_unit,
      scholarship_notes,
      created_at,
      athlete:athletes!left (
        id,
        first_name,
        last_name,
        grad_year
      ),
      program_recruit:program_recruits!left (
        id,
        athlete_id,
        athlete:athletes!left (
          id,
          first_name,
          last_name,
          grad_year
        )
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
    // Primary join: roster_scenario_entries.athlete_id -> athletes
    const athleteRel = row.athlete;
    const directAthlete = Array.isArray(athleteRel) ? athleteRel[0] : athleteRel;

    // Fallback join: roster_scenario_entries.program_recruit_id -> program_recruits.athlete_id -> athletes
    const prRel = row.program_recruit;
    const prRecord = Array.isArray(prRel) ? prRel[0] : prRel;
    const prAthleteRel = prRecord?.athlete;
    const recruitAthlete = Array.isArray(prAthleteRel) ? prAthleteRel[0] : prAthleteRel;

    const athleteRecord = directAthlete ?? recruitAthlete ?? null;

    const firstName = (athleteRecord?.first_name as string | null) ?? "";
    const lastName = (athleteRecord?.last_name as string | null) ?? "";
    const fullName =
      (firstName || lastName
        ? `${firstName} ${lastName}`.trim()
        : "Unnamed athlete") ?? "Unnamed athlete";

    return {
      id: row.id as string,
      athleteId: (row.athlete_id as string | null) ?? (athleteRecord?.id as string | null) ?? null,
      programRecruitId: (row.program_recruit_id as string | null) ?? null,
      eventGroup: (row.event_group as string | null) ?? null,
      name: fullName,
      gradYear: (athleteRecord?.grad_year as number | null) ?? null,
      scholarshipAmount:
        row.scholarship_amount !== null && row.scholarship_amount !== undefined
          ? Number(row.scholarship_amount)
          : null,
      scholarshipUnit: (row.scholarship_unit as string | null) ?? scholarshipUnit,
      scholarshipNotes: (row.scholarship_notes as string | null) ?? null,
      createdAt: (row.created_at as string | null) ?? null,
    };
  });

  // ---- Event group quota fulfillment (best-effort, uses current team season) ----
  const { data: currentSeasonRow } = await supabaseAdmin
    .from("team_seasons")
    .select("id, academic_year, season_label, season_year, event_group_quotas")
    .eq("program_id", programId)
    .eq("team_id", teamId)
    .eq("is_current", true)
    .maybeSingle();

  const quotas: Record<string, number> = (() => {
    const raw = (currentSeasonRow as any)?.event_group_quotas;
    if (!raw || typeof raw !== "object") return {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw as Record<string, any>)) {
      const n = Number(v);
      if (!Number.isNaN(n)) out[k] = n;
    }
    return out;
  })();

  const countsByEventGroup = entries.reduce<Record<string, number>>((acc, e) => {
    const g = (e.eventGroup ?? "").trim();
    if (!g) return acc;
    acc[g] = (acc[g] ?? 0) + 1;
    return acc;
  }, {});

  const quotaRows = Object.keys(quotas)
    .sort((a, b) => a.localeCompare(b))
    .map((k) => ({
      eventGroup: k,
      target: quotas[k] ?? 0,
      current: countsByEventGroup[k] ?? 0,
    }));

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
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--border)] bg-[var(--background)]">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted-foreground)]">
                <Link href="/dashboard" className="hover:text-[var(--foreground)]">
                  Dashboard
                </Link>
                <span>›</span>
                <Link
                  href={`/programs/${programId}`}
                  className="hover:text-[var(--foreground)]"
                >
                  Program
                </Link>
                <span>›</span>
                <Link
                  href={`/programs/${programId}/teams`}
                  className="hover:text-[var(--foreground)]"
                >
                  Teams &amp; rosters
                </Link>
                <span>›</span>
                <Link
                  href={`/programs/${programId}/teams/${teamId}`}
                  className="hover:text-[var(--foreground)]"
                >
                  {teamName}
                </Link>
                <span>›</span>
                <span>Roster scenario</span>
              </div>
              <h1 className="mt-1 text-base font-semibold text-[var(--foreground)]">
                {name}
              </h1>
              {targetLabel && (
                <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                  Target: {targetLabel}
                </p>
              )}
            </div>
            <Link
              href={`/programs/${programId}/teams/${teamId}/roster-planning`}
              className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-[11px] text-[var(--foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--muted-hover)]"
            >
              ← Back to planning
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div>
          <div className="min-w-0 flex-1 space-y-4">
            {/* Scenario workspace (planning) */}
            <section className="rounded-xl bg-[var(--surface)] p-5 ring-1 ring-[var(--border)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="inline-flex items-center rounded-md bg-[var(--muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)]"
                      title="This is a planning workspace"
                    >
                      Scenario workspace
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ${
                        scenarioStatus === "active"
                          ? "bg-[var(--success-subtle)] text-[var(--success)] ring-[var(--success)]"
                          : scenarioStatus === "candidate"
                          ? "bg-[var(--muted)] text-[var(--foreground)] ring-[var(--border)]"
                          : "bg-[var(--surface-subtle)] text-[var(--muted-foreground)] ring-[var(--border)]"
                      }`}
                      title={
                        scenarioStatus === "active"
                          ? "Official roster (locked)"
                          : scenarioStatus === "candidate"
                          ? "Next in line for promotion"
                          : "Safe draft"
                      }
                    >
                      {statusIcon ? <span aria-hidden>{statusIcon}</span> : null}
                      <span>{statusLabel}</span>
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-[var(--foreground)]">
                    You’re editing a roster scenario. It’s safe to experiment here.
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                    Promote to Active only when you’re ready for this scenario to become the official roster.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  {scenarioStatus === "draft" ? (
                    <form action={async () => {
                      "use server";
                      await actionSetScenarioStatus("candidate");
                    }}>
                      <button
                        type="submit"
                        className="rounded-full bg-[var(--muted)] px-3 py-1.5 text-[11px] font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--muted-hover)]"
                        title="Mark this scenario as the primary candidate for promotion"
                      >
                        Promote to Candidate
                      </button>
                    </form>
                  ) : null}

                  {scenarioStatus === "candidate" ? (
                    <>
                      <form action={async () => {
                        "use server";
                        await actionSetScenarioStatus("active");
                      }}>
                        <button
                          type="submit"
                          className="rounded-full bg-[var(--muted)] px-3 py-1.5 text-[11px] font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--muted-hover)]"
                          title="Promote this scenario to the Active Roster"
                        >
                          Promote Active
                        </button>
                      </form>

                      <form action={async () => {
                        "use server";
                        await actionSetScenarioStatus("draft");
                      }}>
                        <button
                          type="submit"
                          className="rounded-full bg-[var(--surface-subtle)] px-3 py-1.5 text-[11px] font-semibold text-[var(--muted-foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--muted-hover)]"
                          title="Return this scenario to Draft"
                        >
                          Back to Draft
                        </button>
                      </form>
                    </>
                  ) : null}

                  {scenarioStatus === "active" ? (
                    <form action={async () => {
                      "use server";
                      await actionReturnToPlanning();
                    }}>
                      <button
                        type="submit"
                        className="rounded-full bg-[var(--muted)] px-3 py-1.5 text-[11px] font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--muted-hover)]"
                        title="Return the Active Roster to planning (demotable unless season is locked)"
                      >
                        Return to Planning
                      </button>
                    </form>
                  ) : null}

                </div>
              </div>
            </section>

            {/* Scenario dashboard (quick-glance) */}
            <section className="rounded-xl bg-[var(--surface)] p-4 ring-1 ring-[var(--border)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                    Scenario dashboard
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                    Quick-glance totals for this scenario only.
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <Link
                    href={`/programs/${programId}/teams/${teamId}/scenarios/${scenarioId}?view=cards`}
                    className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-[11px] font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--muted-hover)]"
                    title="View the entire scenario roster at once"
                  >
                    Bird’s-eye view
                  </Link>
                  <p className="text-[10px] text-[var(--muted-foreground)]">
                    View the entire scenario roster at once
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg bg-[var(--surface-subtle)] p-3 ring-1 ring-[var(--border)]">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                    Scholarship used
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                    {formattedTotal} <span className="text-[10px] font-normal text-[var(--muted-foreground)]">{unitLabel}</span>
                  </p>
                  <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
                    {formattedBudget !== null ? (
                      <>Budget {formattedBudget} {unitLabel} • Remaining {formattedRemaining ?? "—"} {unitLabel}</>
                    ) : (
                      <>Team budget not set</>
                    )}
                  </p>
                </div>

                <div className="rounded-lg bg-[var(--surface-subtle)] p-3 ring-1 ring-[var(--border)]">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                    Headcount
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                    {entries.length}
                  </p>
                  <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
                    Scenario entries
                  </p>
                </div>

                <div className="rounded-lg bg-[var(--surface-subtle)] p-3 ring-1 ring-[var(--border)]">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                    Event group quotas
                  </p>
                  {quotaRows.length ? (
                    <div className="mt-1 space-y-1">
                      {quotaRows.slice(0, 4).map((q) => (
                        <div key={q.eventGroup} className="flex items-center justify-between text-[11px]">
                          <span className="truncate text-[var(--foreground)]">{q.eventGroup}</span>
                          <span className="shrink-0 text-[var(--muted-foreground)]">{q.current}/{q.target}</span>
                        </div>
                      ))}
                      {quotaRows.length > 4 ? (
                        <p className="pt-1 text-[10px] text-[var(--muted-foreground)]">+{quotaRows.length - 4} more</p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                      No quotas configured
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Cards overlay (read-only) */}
            {isCardsView ? (
              <div className="fixed inset-0 z-50 bg-[rgba(0,0,0,0.6)] p-3 sm:p-6">
                <div className="mx-auto h-full w-full max-w-7xl overflow-hidden rounded-xl bg-[var(--background)] ring-1 ring-[var(--border)]">
                  <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                    <div>
                      <p className="text-xs font-semibold text-[var(--foreground)]">Bird’s-eye view</p>
                      <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">Read-only view (no edits here).</p>
                    </div>
                    <Link
                      href={`/programs/${programId}/teams/${teamId}/scenarios/${scenarioId}`}
                      className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-[11px] font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--muted-hover)]"
                      title="Close"
                    >
                      Close
                    </Link>
                  </div>

                  <div className="h-[calc(100%-56px)] overflow-auto p-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {entries.map((e) => (
                        <div
                          key={e.id}
                          className="rounded-xl bg-[var(--surface)] p-3 ring-1 ring-[var(--border)]"
                        >
                          <p className="truncate text-sm font-semibold text-[var(--foreground)]">{e.name}</p>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--muted-foreground)]">
                            <span>Grad {e.gradYear ?? "—"}</span>
                            <span>{e.eventGroup ?? "No group"}</span>
                          </div>
                          <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">
                            Scholarship: {e.scholarshipAmount ?? "—"} {e.scholarshipUnit === "percent" ? "%" : e.scholarshipUnit === "equivalency" ? "eq" : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Scenario athletes */}
            <section className="rounded-xl bg-[var(--surface)] p-5 ring-1 ring-[var(--border)]">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                Scenario athletes
              </p>
              <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                Click an athlete to edit details in the popover. Add athletes from the Toolbox.
              </p>

              <div className="mt-4">
                <ScenarioRosterClient
                  programId={programId}
                  teamId={teamId}
                  scenarioId={scenarioId}
                  isManager={isManager}
                  initialEntries={entries as any}
                />
              </div>
            </section>
          </div>

          {/* right sidebar removed */}
        </div>
      </main>
    </div>
  );
}