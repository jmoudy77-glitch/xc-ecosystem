// app/programs/[programId]/teams/[teamId]/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import TeamManagementShell from "./TeamManagementShell";
import type { TeamSeasonSummary } from "./TeamSeasonsClient";

type PageProps = {
  params: Promise<{
    programId: string;
    teamId: string;
  }>;
};

const MANAGER_ROLES = ["head_coach", "director", "admin"] as const;

export default async function TeamDetailPage({ params }: PageProps) {
  // Next 16: params is a Promise, so we await it
  const { programId, teamId } = await params;

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
    .select("id, auth_id, email")
    .eq("auth_id", authId)
    .maybeSingle();

  if (!userRow) {
    redirect("/dashboard");
  }

  const viewerUserId = userRow.id as string;

  // Membership + program info
  const { data: membership } = await supabaseAdmin
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

  // Load team
  const { data: teamRow, error: teamError } = await supabaseAdmin
    .from("teams")
    .select("id, program_id, name, code, sport, gender, level")
    .eq("id", teamId)
    .eq("program_id", programId)
    .maybeSingle();

  if (teamError) {
    console.error("[TeamDetail] team error:", teamError);
    throw new Error("Failed to load team");
  }

  if (!teamRow) {
    redirect(`/programs/${programId}/teams`);
  }

  const teamName = (teamRow.name as string) ?? "Team";

  // Load seasons
  const { data: seasonRows, error: seasonsError } = await supabaseAdmin
    .from("team_seasons")
    .select(
      `
      id,
      team_id,
      season_label,
      season_year,
      start_date,
      end_date,
      is_active,
      created_at
    `,
    )
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  if (seasonsError) {
    console.error("[TeamDetail] seasons error:", seasonsError);
    throw new Error("Failed to load seasons");
  }

  const seasons: TeamSeasonSummary[] = (seasonRows ?? []).map((row: any) => ({
    id: row.id as string,
    teamId: row.team_id as string,
    season_label: (row.season_label as string) ?? "",
    season_year: (row.season_year as number | null) ?? null,
    start_date: (row.start_date as string | null) ?? null,
    end_date: (row.end_date as string | null) ?? null,
    is_active: (row.is_active as boolean) ?? true,
  }));

  // Determine the active or next-up season for display
  const todayIso = new Date().toISOString().slice(0, 10);
  const activeSeason =
    seasons.find((s) => s.is_active) ??
    seasons
      .filter((s) => !s.start_date || s.start_date <= todayIso)
      .sort((a, b) => {
        const ay = a.season_year ?? 0;
        const by = b.season_year ?? 0;
        return by - ay;
      })[0];

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
                <span>{teamName}</span>
              </div>
              <h1 className="mt-1 text-base font-semibold text-slate-100">
                {teamName}
              </h1>
              <p className="mt-1 text-[11px] text-slate-500">
                Team management, seasons, and roster planning.
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="border-b border-slate-900/80 bg-slate-950/80">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px]">
            <div className="flex flex-wrap items-center gap-2 text-slate-500">
              <span className="uppercase tracking-wide text-slate-400">
                Season tools
              </span>
              {activeSeason ? (
                <span className="rounded-full border border-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                  Active season:{" "}
                  <span className="font-medium text-slate-200">
                    {activeSeason.season_label}
                    {activeSeason.season_year
                      ? ` ${activeSeason.season_year}`
                      : ""}
                  </span>
                </span>
              ) : (
                <span className="rounded-full border border-slate-800 px-2 py-0.5 text-[10px] text-slate-500">
                  No active season selected
                </span>
              )}
            </div>
            {activeSeason && (
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/programs/${programId}/teams/${teamId}/seasons/${activeSeason.id}/practice`}
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-medium text-emerald-100 hover:border-emerald-400 hover:bg-emerald-500/20"
                >
                  <span>Practice Scheduler</span>
                  <span className="rounded-full border border-emerald-500/60 px-1.5 py-[1px] text-[9px] uppercase tracking-wide">
                    New
                  </span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <TeamManagementShell
        programId={programId}
        teamId={teamId}
        programName={programName}
        teamName={teamName}
        teamMeta={{
          sport: teamRow.sport as string,
          gender: (teamRow.gender as string | null) ?? null,
          level: (teamRow.level as string | null) ?? null,
        }}
        seasons={seasons}
        isManager={isManager}
        activeSeason={activeSeason ?? null}
      />
    </div>
  );
}