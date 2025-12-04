// app/programs/[programId]/teams/[teamId]/seasons/[seasonId]/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import SeasonRosterClient, {
  type RosterEntry,
} from "./SeasonRosterClient";

type PageProps = {
  params: Promise<{
    programId: string;
    teamId: string;
    seasonId: string;
  }>;
};

const MANAGER_ROLES = ["head_coach", "director", "admin"] as const;

export default async function TeamSeasonRosterPage({ params }: PageProps) {
  const { programId, teamId, seasonId } = await params;

  const supabase = await supabaseServerComponent();

  // 1) Auth
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const authId = authUser.id;

  // 2) Viewer user row
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id, auth_id, email")
    .eq("auth_id", authId)
    .maybeSingle();

  if (!userRow) {
    redirect("/dashboard");
  }

  const viewerUserId = userRow.id as string;

  // 3) Membership + program
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
    `
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

  // 4) Team
  const { data: teamRow } = await supabaseAdmin
    .from("teams")
    .select("id, name")
    .eq("id", teamId)
    .eq("program_id", programId)
    .maybeSingle();

  if (!teamRow) {
    redirect(`/programs/${programId}/teams`);
  }

  const teamName = (teamRow.name as string) ?? "Team";

  // 5) Season
    const { data: seasonRow } = await supabaseAdmin
        .from("team_seasons")
        .select("id, season_label, roster_lock_date")
        .eq("id", seasonId)
        .eq("team_id", teamId)
        .maybeSingle();

  if (!seasonRow) {
    redirect(`/programs/${programId}/teams/${teamId}`);
  }

  const seasonLabel = (seasonRow.season_label as string) ?? "Season";
  const lockDateStr = seasonRow.roster_lock_date as string | null;
  const isLocked =
    !!lockDateStr && new Date(lockDateStr).getTime() <= Date.now();

  // 6) Roster (JOIN → athletes, using actual columns)
  const { data: rosterRows, error: rosterError } = await supabaseAdmin
    .from("team_roster")
    .select(
      `
      id,
      program_id,
      team_id,
      team_season_id,
      athlete_id,
      status,
      role,
      program_recruit_id,
      created_at,
      athlete:athletes!inner (
        id,
        first_name,
        last_name,
        grad_year,
        event_group
      )
    `
    )
    .eq("team_season_id", seasonId);

  if (rosterError) {
    console.error("[TeamSeasonRoster] roster select error:", rosterError);
    throw new Error("Failed to load roster");
  }

  const roster: RosterEntry[] = (rosterRows ?? []).map((row: any) => {
    const athleteRel = row.athlete;
    const athleteRecord = Array.isArray(athleteRel)
      ? athleteRel[0]
      : athleteRel;

    const firstName =
      (athleteRecord?.first_name as string | null) ?? null;
    const lastName =
      (athleteRecord?.last_name as string | null) ?? null;
    const name =
      [firstName, lastName].filter(Boolean).join(" ").trim() || "Athlete";

    // We don't have email/avatar on athletes; keep null and let UI use initials, etc.
    return {
      id: row.id as string,
      athleteId: row.athlete_id as string,
      name,
      email: null,
      avatarUrl: null,
      status: (row.status as string) ?? "active",
      role: (row.role as string | null) ?? null,
      programRecruitId:
        (row.program_recruit_id as string | null) ?? null,
    };
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
                Roster view for this season. Add signed / enrolled recruits
                directly into this team&apos;s lineup.
              </p>
            </div>
          </div>
        </div>
      </header>

    <main className="mx-auto max-w-6xl px-4 py-6">
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