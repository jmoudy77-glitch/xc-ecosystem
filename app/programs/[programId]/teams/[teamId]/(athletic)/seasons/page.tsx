

// app/programs/[programId]/teams/[teamId]/seasons/page.tsx

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import TeamSeasonsClient, { type TeamSeasonSummary } from "../../TeamSeasonsClient";

type PageProps = {
  params: Promise<{
    programId: string;
    teamId: string;
  }>;
};

const MANAGER_ROLES = ["head_coach", "director", "admin"] as const;

export default async function TeamSeasonsPage({ params }: PageProps) {
  const { programId, teamId } = await params;

  const supabase = await supabaseServerComponent();

  // Auth
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  // Map auth user -> public.users row
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id, auth_id")
    .eq("auth_id", authUser.id)
    .maybeSingle();

  if (!userRow) redirect("/dashboard");

  const viewerUserId = userRow.id as string;

  // Program membership (for manager privileges)
  const { data: membership } = await supabaseAdmin
    .from("program_members")
    .select("id, role")
    .eq("program_id", programId)
    .eq("user_id", viewerUserId)
    .maybeSingle();

  if (!membership) redirect("/dashboard");

  const actingRole = (membership.role as string | null) ?? null;
  const isManager =
    actingRole !== null &&
    MANAGER_ROLES.includes(actingRole.toLowerCase() as (typeof MANAGER_ROLES)[number]);

  // Team
  const { data: teamRow, error: teamError } = await supabaseAdmin
    .from("teams")
    .select("id, name")
    .eq("id", teamId)
    .eq("program_id", programId)
    .maybeSingle();

  if (teamError) {
    console.error("[TeamSeasonsPage] team error:", teamError);
    throw new Error("Failed to load team");
  }

  if (!teamRow) redirect(`/programs/${programId}/teams`);

  const teamName = (teamRow.name as string) ?? "Team";

  // Seasons
  const { data: seasonRows, error: seasonsError } = await supabaseAdmin
    .from("team_seasons")
    .select(
      [
        "id",
        "team_id",
        "program_id",
        "academic_year",
        "year_start",
        "year_end",
        "season_label",
        "season_year",
        "start_date",
        "end_date",
        "is_current",
        "is_active",
        "created_at",
      ].join(",")
    )
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  if (seasonsError) {
    console.error("[TeamSeasonsPage] seasons error:", seasonsError);
    throw new Error("Failed to load seasons");
  }

  const seasons: TeamSeasonSummary[] = (seasonRows ?? []).map((row: any) => ({
    id: row.id as string,
    team_id: row.team_id as string,
    program_id: row.program_id as string,
    academic_year: (row.academic_year as string) ?? "",
    year_start: (row.year_start as number) ?? 0,
    year_end: (row.year_end as number | null) ?? null,
    season_label: (row.season_label as string) ?? "",
    season_year: (row.season_year as number | null) ?? null,
    start_date: (row.start_date as string | null) ?? null,
    end_date: (row.end_date as string | null) ?? null,
    is_current: (row.is_current as boolean) ?? false,
    is_active: (row.is_active as boolean) ?? true,
  }));

  return (
    <section className="rounded-2xl bg-slate-900/70 p-4 ring-1 ring-slate-800 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          Seasons
        </h2>
      </div>
      <div className="mt-3">
        <TeamSeasonsClient
          programId={programId}
          teamId={teamId}
          teamName={teamName}
          isManager={isManager}
          seasons={seasons}
        />
      </div>
    </section>
  );
}