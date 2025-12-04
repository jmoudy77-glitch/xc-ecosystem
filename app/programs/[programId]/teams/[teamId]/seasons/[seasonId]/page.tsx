// app/programs/[programId]/teams/[teamId]/seasons/[seasonId]/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type PageProps = {
  params: Promise<{
    programId: string;
    teamId: string;
    seasonId: string;
  }>;
};

export default async function TeamSeasonRosterPage({ params }: PageProps) {
  const { programId, teamId, seasonId } = await params;

  const supabase = await supabaseServerComponent();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const authId = authUser.id;

  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id, auth_id, email")
    .eq("auth_id", authId)
    .maybeSingle();

  if (!userRow) {
    redirect("/dashboard");
  }

  const viewerUserId = userRow.id as string;

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

  // Load team
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

  // Load season
  const { data: seasonRow } = await supabaseAdmin
    .from("team_seasons")
    .select("id, season_label, season_year")
    .eq("id", seasonId)
    .eq("team_id", teamId)
    .maybeSingle();

  if (!seasonRow) {
    redirect(`/programs/${programId}/teams/${teamId}`);
  }

  const seasonLabel = (seasonRow.season_label as string) ?? "Season";

  // Load roster
  const { data: rosterRows } = await supabaseAdmin
    .from("team_roster")
    .select(
      `
      id,
      team_season_id,
      athlete_id,
      status,
      role,
      created_at,
      athlete:athletes!inner (
        id,
        email,
        avatar_url
      )
    `,
    )
    .eq("team_season_id", seasonId);

  const roster = (rosterRows ?? []).map((row: any) => {
    const athleteRel = row.athlete;
    const athleteRecord = Array.isArray(athleteRel) ? athleteRel[0] : athleteRel;

    const email = (athleteRecord?.email as string | null) ?? null;
    const name = email?.split("@")[0] ?? "Athlete";

    return {
      id: row.id as string,
      athleteId: row.athlete_id as string,
      name,
      email,
      avatarUrl: (athleteRecord?.avatar_url as string | null) ?? null,
      status: (row.status as string) ?? "active",
      role: (row.role as string | null) ?? null,
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
                Roster view for this season. (Next step: add athlete picker,
                statuses, and integrations.)
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Season roster
          </p>

          {roster.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              No athletes have been added to this roster yet.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {roster.map((entry) => {
                const initials =
                  (entry.name || entry.email || "A")
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-slate-800 text-xs font-semibold text-slate-100">
                        {entry.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={entry.avatarUrl}
                            alt={entry.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span>{initials}</span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-100">
                          {entry.name}
                        </span>
                        {entry.email && (
                          <span className="text-xs text-slate-400">
                            {entry.email}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 text-[10px]">
                      <span className="rounded-full border border-slate-700 px-2 py-[1px] text-slate-200">
                        {entry.status}
                      </span>
                      {entry.role && (
                        <span className="rounded-full border border-slate-700 px-2 py-[1px] text-slate-200">
                          {entry.role}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}