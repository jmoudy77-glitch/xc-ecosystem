// app/programs/[programId]/teams/page.tsx
// Program Teams page (server component)

import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import TeamListClient, {
  type TeamSummary,
} from "./TeamListClient";

type PageProps = {
  params: Promise<{
    programId: string;
  }>;
};

const MANAGER_ROLES = ["head_coach", "director", "admin"] as const;

export default async function ProgramTeamsPage({ params }: PageProps) {
  const { programId } = await params;

  const supabase = await supabaseServerComponent();

  // 1) Auth
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.warn("[ProgramTeams] auth.getUser error:", authError.message);
  }

  if (!authUser) {
    redirect("/login");
  }

  const authId = authUser.id;

  // 2) Ensure viewer has a row in public.users
  const { data: existingUserRow, error: userSelectError } = await supabaseAdmin
    .from("users")
    .select("id, auth_id, email")
    .eq("auth_id", authId)
    .maybeSingle();

  if (userSelectError) {
    console.error("[ProgramTeams] users select error:", userSelectError);
    throw new Error("Failed to load viewer user record");
  }

  let viewerUserRow = existingUserRow;

  if (!viewerUserRow) {
    const {
      data: insertedUser,
      error: userInsertError,
    } = await supabaseAdmin
      .from("users")
      .insert({
        auth_id: authId,
        email: authUser.email ?? null,
      })
      .select("id, auth_id, email")
      .single();

    if (userInsertError) {
      console.error(
        "[ProgramTeams] Failed to create viewer user row:",
        userInsertError
      );
      throw new Error("Failed to create user record");
    }

    viewerUserRow = insertedUser;
  }

  const viewerUserId = viewerUserRow.id as string;

  // 3) Viewer membership & program basic info
  const { data: membershipRow, error: membershipError } = await supabaseAdmin
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
    console.error("[ProgramTeams] membership error:", membershipError);
    throw new Error("Failed to load membership");
  }

  if (!membershipRow || !membershipRow.programs) {
    redirect("/dashboard");
  }

  const programsRel = (membershipRow as any).programs;
  const programRecord = Array.isArray(programsRel)
    ? programsRel[0]
    : programsRel;

  const programName = (programRecord?.name as string) ?? "Program";

  const actingRole: string | null = (membershipRow.role as string) ?? null;
  const isManager =
    actingRole !== null &&
    MANAGER_ROLES.includes(actingRole.toLowerCase() as any);

  // 4) Load teams for this program
  const { data: teamRows, error: teamsError } = await supabaseAdmin
    .from("teams")
    .select(
      `
      id,
      program_id,
      name,
      code,
      sport,
      gender,
      level,
      season
    `
    )
    .eq("program_id", programId)
    .order("name", { ascending: true });

  if (teamsError) {
    console.error("[ProgramTeams] teams error:", teamsError);
    throw new Error("Failed to load teams");
  }

  const teams: TeamSummary[] = (teamRows ?? []).map((row: any) => ({
    id: row.id as string,
    programId: row.program_id as string,
    name: (row.name as string) ?? "Team",
    code: (row.code as string | null) ?? null,
    sport: (row.sport as string | null) ?? null,
    gender: (row.gender as string | null) ?? null,
    level: (row.level as string | null) ?? null,
    season: (row.season as string | null) ?? null,
  }));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <Link
                  href="/dashboard"
                  className="hover:text-slate-200"
                >
                  Dashboard
                </Link>
                <span>›</span>
                <Link
                  href={`/programs/${programId}`}
                  className="hover:text-slate-200"
                >
                  Program overview
                </Link>
                <span>›</span>
                <span>Teams &amp; rosters</span>
              </div>
              <h1 className="mt-1 text-base font-semibold text-slate-100">
                {programName}
              </h1>
              <p className="mt-1 text-[11px] text-slate-500">
                Structure this program into teams. Each team will eventually
                have seasons and rosters attached.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <TeamListClient
          programId={programId}
          isManager={isManager}
          teams={teams}
        />
      </main>
    </div>
  );
}