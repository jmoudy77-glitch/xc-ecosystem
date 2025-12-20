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
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const MANAGER_ROLES = ["head_coach", "director", "admin"] as const;

export default async function ProgramTeamsPage({ params, searchParams }: PageProps) {
  const { programId } = await params;
  const sp = (await searchParams) ?? {};
  const manage = Array.isArray(sp.manage) ? sp.manage[0] : sp.manage;
  const forceManage = manage === "1" || manage === "true";

  const supabase = await supabaseServerComponent();

  //
  // 1) Auth
  //
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

  //
  // 2) Ensure viewer user row exists (same pattern as overview/staff)
  //
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
        userInsertError,
      );
      throw new Error("Failed to create user record");
    }

    viewerUserRow = insertedUser;
  }

  const viewerUserId = viewerUserRow.id as string;

  //
  // 3) Membership & program basic info
  //
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
    `,
    )
    .eq("program_id", programId)
    .eq("user_id", viewerUserId)
    .maybeSingle();

  if (membershipError) {
    console.error("[ProgramTeams] membership error:", membershipError);
    throw new Error("Failed to load membership");
  }

  if (!membershipRow || !membershipRow.programs) {
    // Not a member of this program → bounce to dashboard
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

  //
  // 4) Load teams for this program
  //
  const { data: teamRows, error: teamError } = await supabaseAdmin
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
    `,
    )
    .eq("program_id", programId)
    .order("name", { ascending: true });

  if (teamError) {
    console.error("[ProgramTeams] teams error:", teamError);
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

  //
  // 5) Render inside ProgramLayout shell
  //
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 md:h-[calc(100vh-220px)] md:overflow-hidden">
      {/* Context (lightweight; avoids competing with the program hero) */}
      <section className="shrink-0 rounded-xl border border-subtle bg-surface/40 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] text-muted">
              <Link href="/dashboard" className="hover:underline">
                Dashboard
              </Link>
              <span>›</span>
              <Link
                href={`/programs/${programId}`}
                className="hover:underline"
              >
                {programName}
              </Link>
              <span>›</span>
              <span>Teams</span>
            </div>

            <h1 className="mt-1 text-sm font-semibold text-slate-100">
              Teams
            </h1>
            <p className="mt-1 text-[11px] text-muted">
              Manage the teams that make up your program. Create, edit, or review team structure here before working with seasons, rosters, and day-to-day operations.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 text-right text-[11px] text-muted">
            <div className="hidden sm:block">
              <p>
                Your role:{" "}
                <span className="font-mono text-[11px] text-slate-100">
                  {actingRole ?? "unknown"}
                </span>
              </p>
              <p className="mt-1">
                Manager privileges:{" "}
                <span className="font-mono text-[11px] text-slate-100">
                  {isManager ? "yes" : "no"}
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Teams list panel (scrolls on desktop) */}
      <section className="flex-1 overflow-y-auto rounded-xl border border-subtle bg-surface p-4">
        <TeamListClient
          programId={programId}
          isManager={isManager}
          teams={teams}
        />
      </section>
    </div>
  );
}