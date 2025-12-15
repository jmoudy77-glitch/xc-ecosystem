// app/programs/[programId]/teams/[teamId]/layout.tsx

import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import TeamManagementShell from "./TeamManagementShell";
import type { TeamSeasonSummary } from "./TeamSeasonsClient";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{
    programId: string;
    teamId: string;
  }>;
};

const MANAGER_ROLES = ["head_coach", "director", "admin"] as const;

export default async function TeamLayout({ children, params }: LayoutProps) {
  const { programId, teamId } = await params;

  const supabase = await supabaseServerComponent();

  // Auth
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const authId = authUser.id;

  // Ensure user row
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id, auth_id, email")
    .eq("auth_id", authId)
    .maybeSingle();

  if (!userRow) redirect("/dashboard");

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
    `
    )
    .eq("program_id", programId)
    .eq("user_id", viewerUserId)
    .maybeSingle();

  if (!membership || !(membership as any).programs) redirect("/dashboard");

  const programsRel = (membership as any).programs;
  const programRecord = Array.isArray(programsRel) ? programsRel[0] : programsRel;

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
    console.error("[TeamLayout] team error:", teamError);
    throw new Error("Failed to load team");
  }

  if (!teamRow) redirect(`/programs/${programId}/teams`);

  const teamName = (teamRow.name as string) ?? "Team";

  // Load seasons
  const { data: seasonRows, error: seasonsError } = await supabaseAdmin
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
      is_current,
      is_active,
      created_at
    `
    )
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  if (seasonsError) {
    console.error("[TeamLayout] seasons error:", seasonsError);
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

  // Determine active season (passed to shell for setup gating)
  const todayIso = new Date().toISOString().slice(0, 10);
  const activeSeason =
    seasons.find((s) => s.is_current) ??
    seasons.find((s) => s.is_active) ??
    seasons
      .filter((s) => !s.start_date || s.start_date <= todayIso)
      .sort((a, b) => (b.season_year ?? 0) - (a.season_year ?? 0))[0] ??
    null;

  return (
    <TeamManagementShell
          programId={programId}
          teamId={teamId}
          teamName={teamName}
          isManager={isManager}
          seasons={seasons}
          activeSeason={activeSeason} programName={""} teamMeta={{
              sport: "",
              gender: null,
              level: null
          }}    >
      {children}
    </TeamManagementShell>
  );
}