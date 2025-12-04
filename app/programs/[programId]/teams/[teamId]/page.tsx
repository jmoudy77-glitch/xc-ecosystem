// app/programs/[programId]/teams/[teamId]/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import TeamSeasonsClient, {
  type TeamSeasonSummary,
} from "./TeamSeasonsClient";

type PageProps = {
  params: Promise<{
    programId: string;
    teamId: string;
  }>;
};

const MANAGER_ROLES = ["head_coach", "director", "admin"] as const;

export default async function TeamDetailPage({ params }: PageProps) {
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
                Seasons and rosters for this team.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <TeamSeasonsClient
          programId={programId}
          teamId={teamId}
          teamName={teamName}
          isManager={isManager}
          seasons={seasons}
        />
      </main>
    </div>
  );
}