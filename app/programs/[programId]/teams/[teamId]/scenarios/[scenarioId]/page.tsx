// app/programs/[programId]/teams/[teamId]/scenarios/[scenarioId]/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type PageProps = {
  params: Promise<{
    programId: string;
    teamId: string;
    scenarioId: string;
  }>;
};

function isUuidLike(id: string): boolean {
  return /^[0-9a-fA-F-]{36}$/.test(id);
}

export default async function ScenarioPage({ params }: PageProps) {
  const { programId, teamId, scenarioId } = await params;

  // If the id is not even shaped like a UUID, don't hit the DB at all.
  if (!isUuidLike(scenarioId)) {
    console.warn("[RosterScenario] Non-UUID scenarioId:", scenarioId);
    redirect(`/programs/${programId}/teams/${teamId}`);
  }

  const supabase = await supabaseServerComponent();

  // Auth
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const authId = authUser.id;

  // Ensure user row
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id, auth_id")
    .eq("auth_id", authId)
    .maybeSingle();

  if (!userRow) {
    redirect("/dashboard");
  }

  const viewerUserId = userRow.id as string;

  // Ensure membership in this program
  const { data: membership } = await supabaseAdmin
    .from("program_members")
    .select("id")
    .eq("program_id", programId)
    .eq("user_id", viewerUserId)
    .maybeSingle();

  if (!membership) {
    redirect("/dashboard");
  }

  // Load scenario
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
    scenarioRow.program_id !== programId ||
    scenarioRow.team_id !== teamId
  ) {
    redirect(`/programs/${programId}/teams/${teamId}`);
  }

  const name = (scenarioRow.name as string) ?? "Scenario";
  const targetLabel =
    (scenarioRow.target_season_label as string | null) ??
    (scenarioRow.target_season_year
      ? `Season ${scenarioRow.target_season_year}`
      : null);

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
                  Team
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

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-4">
        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Scenario overview
          </p>
          <p className="mt-2 text-sm text-slate-200">
            This is a sandbox scenario for planning future rosters. Changes here
            do not affect your official season rosters.
          </p>
          {scenarioRow.notes && (
            <p className="mt-3 text-[11px] text-slate-300 whitespace-pre-wrap">
              {scenarioRow.notes}
            </p>
          )}
        </section>

        {/* Future: entries list, add-from-roster, add-from-recruits, projections, etc. */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Roster projections
          </p>
          <p className="mt-2 text-[11px] text-slate-500">
            Coming soon: add athletes and recruits into this scenario, assign
            scholarship levels, event groups, and class years, and view
            scholarship totals and roster balance over time.
          </p>
        </section>
      </main>
    </div>
  );
}