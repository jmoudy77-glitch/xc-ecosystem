// app/programs/[programId]/teams/page.tsx
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Team = {
  id: string;
  program_id: string;
  name: string;
  code: string | null;
  sport: string | null;
  gender: string | null;
  level: string | null;
  season: string | null;
  is_primary: boolean | null;
  created_at: string | null;
};

type Season = {
  id: string;
  team_id: string;
  program_id: string;
  academic_year: string;
  year_start: number;
  year_end: number | null;
  season_label: string;
  is_current: boolean;
  created_at: string | null;
};

type TeamsResponse = {
  programId: string;
  teams: Team[];
  error?: string;
};

type SeasonsResponse = {
  programId: string;
  teamId: string;
  seasons: Season[];
  error?: string;
};

export default function ProgramTeamsPage() {
  const params = useParams();
  const router = useRouter();
  const programId = params?.programId as string | undefined;

  const [teamsData, setTeamsData] = useState<TeamsResponse | null>(null);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [teamsError, setTeamsError] = useState<string | null>(null);

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [seasonsData, setSeasonsData] = useState<SeasonsResponse | null>(null);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [seasonsError, setSeasonsError] = useState<string | null>(null);

  // Create team form state
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sport, setSport] = useState("Track & Field");
  const [gender, setGender] = useState("Coed");
  const [level, setLevel] = useState("Varsity");
  const [season, setSeason] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [creatingTeam, setCreatingTeam] = useState(false);

  // Create season form state (for selected team)
  const [academicYear, setAcademicYear] = useState("");
  const [yearStart, setYearStart] = useState("");
  const [yearEnd, setYearEnd] = useState("");
  const [seasonLabel, setSeasonLabel] = useState("Cross Country");
  const [isCurrentSeason, setIsCurrentSeason] = useState(true);
  const [creatingSeason, setCreatingSeason] = useState(false);

  async function loadTeams(currentProgramId: string) {
    setLoadingTeams(true);
    setTeamsError(null);

    try {
      const res = await fetch(`/api/programs/${currentProgramId}/teams`);
      const body = (await res.json().catch(() => ({}))) as TeamsResponse & {
        error?: string;
      };

      if (!res.ok) {
        setTeamsError(
          body.error || `Failed to load teams (HTTP ${res.status})`,
        );
        setTeamsData(null);
        return;
      }

      setTeamsData({
        programId: body.programId,
        teams: body.teams || [],
      });
    } catch (err: any) {
      console.error("[ProgramTeamsPage] loadTeams error:", err);
      setTeamsError(err?.message || "Unexpected error loading teams");
      setTeamsData(null);
    } finally {
      setLoadingTeams(false);
    }
  }

  async function loadSeasons(currentProgramId: string, teamId: string) {
    setLoadingSeasons(true);
    setSeasonsError(null);

    try {
      const res = await fetch(
        `/api/programs/${currentProgramId}/teams/${teamId}/seasons`,
      );
      const body = (await res.json().catch(() => ({}))) as SeasonsResponse & {
        error?: string;
      };

      if (!res.ok) {
        setSeasonsError(
          body.error || `Failed to load seasons (HTTP ${res.status})`,
        );
        setSeasonsData(null);
        return;
      }

      setSeasonsData({
        programId: body.programId,
        teamId: body.teamId,
        seasons: body.seasons || [],
      });
    } catch (err: any) {
      console.error("[ProgramTeamsPage] loadSeasons error:", err);
      setSeasonsError(err?.message || "Unexpected error loading seasons");
      setSeasonsData(null);
    } finally {
      setLoadingSeasons(false);
    }
  }

  useEffect(() => {
    if (!programId) return;
    void loadTeams(programId);
  }, [programId]);

  async function handleCreateTeam(e: FormEvent) {
    e.preventDefault();
    if (!programId) return;

    setCreatingTeam(true);
    setTeamsError(null);

    try {
      const payload = {
        name: name.trim(),
        code: code.trim() || null,
        sport: sport.trim() || null,
        gender: gender.trim() || null,
        level: level.trim() || null,
        season: season.trim() || null,
        isPrimary,
      };

      const res = await fetch(`/api/programs/${programId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setTeamsError(
          body.error || `Failed to create team (HTTP ${res.status})`,
        );
        return;
      }

      // Reset form
      setName("");
      setCode("");
      setSport("Track & Field");
      setGender("Coed");
      setLevel("Varsity");
      setSeason("");
      setIsPrimary(false);

      await loadTeams(programId);
    } catch (err: any) {
      console.error("[ProgramTeamsPage] createTeam error:", err);
      setTeamsError(err?.message || "Unexpected error creating team");
    } finally {
      setCreatingTeam(false);
    }
  }

  async function handleCreateSeason(e: FormEvent) {
    e.preventDefault();
    if (!programId || !selectedTeamId) return;

    setCreatingSeason(true);
    setSeasonsError(null);

    try {
      const payload = {
        academicYear: academicYear.trim(),
        yearStart: yearStart ? Number(yearStart) : undefined,
        yearEnd: yearEnd ? Number(yearEnd) : undefined,
        seasonLabel: seasonLabel.trim(),
        isCurrent: isCurrentSeason,
      };

      const res = await fetch(
        `/api/programs/${programId}/teams/${selectedTeamId}/seasons`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const body = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setSeasonsError(
          body.error || `Failed to create season (HTTP ${res.status})`,
        );
        return;
      }

      // Reset form
      setAcademicYear("");
      setYearStart("");
      setYearEnd("");
      setSeasonLabel("Cross Country");
      setIsCurrentSeason(true);

      await loadSeasons(programId, selectedTeamId);
    } catch (err: any) {
      console.error("[ProgramTeamsPage] createSeason error:", err);
      setSeasonsError(err?.message || "Unexpected error creating season");
    } finally {
      setCreatingSeason(false);
    }
  }

  const teams = teamsData?.teams ?? [];

  const selectedTeam =
    selectedTeamId && teams.length
      ? teams.find((t) => t.id === selectedTeamId) ?? null
      : null;

  // Dark-shell layout similar to dashboard
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-xs font-semibold text-slate-950">
              XC
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-50">
                XC Ecosystem
              </p>
              <p className="text-[11px] text-slate-400">
                Teams &amp; divisions for your program
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            {programId && (
              <p className="font-mono text-[11px] text-slate-400">
                Program: {programId}
              </p>
            )}
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="mt-1 rounded-full border border-slate-600 px-3 py-1 text-[11px] text-slate-100 hover:border-slate-400"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
        {teamsError && (
          <div className="rounded-xl border border-red-500/40 bg-red-950/60 px-3 py-2 text-xs text-red-100">
            {teamsError}
          </div>
        )}

        {/* Create team */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-50">
            Create a team or division
          </h2>
          <p className="text-[11px] text-slate-400">
            Think &quot;Men&apos;s Cross Country&quot;, &quot;Women&apos;s Outdoor&quot;,
            or &quot;JV Track&quot;.
          </p>

          <form onSubmit={handleCreateTeam} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-200">
                  Team name<span className="text-red-400">*</span>
                </label>
                <input
                  required
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500"
                  placeholder="e.g. Men&apos;s Cross Country"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-200">
                  Short code
                </label>
                <input
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500"
                  placeholder="Optional code, e.g. M-XC"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-200">
                  Sport
                </label>
                <input
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500"
                  placeholder="e.g. Cross Country, Track &amp; Field"
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-200">
                  Gender
                </label>
                <input
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500"
                  placeholder="e.g. Men, Women, Coed"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-200">
                  Level
                </label>
                <input
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500"
                  placeholder="e.g. Varsity, JV"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-200">
                  Default season label
                </label>
                <input
                  className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500"
                  placeholder="Optional, e.g. Cross Country"
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 pt-5 md:col-span-2">
                <input
                  id="isPrimary"
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-slate-50"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                />
                <label
                  htmlFor="isPrimary"
                  className="text-[11px] text-slate-200 select-none"
                >
                  Mark as primary team for this program
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={creatingTeam}
                className="rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow disabled:opacity-60 hover:bg-blue-400"
              >
                {creatingTeam ? "Creating…" : "Create team"}
              </button>
            </div>
          </form>
        </section>

        {/* Teams list */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-50">
                Teams in this program
              </h2>
              <p className="text-[11px] text-slate-400">
                {loadingTeams
                  ? "Loading teams…"
                  : teams.length === 0
                  ? "No teams created yet."
                  : `This program has ${teams.length} team${
                      teams.length === 1 ? "" : "s"
                    }.`}
              </p>
            </div>
          </div>

          {loadingTeams ? (
            <p className="text-xs text-slate-400">Loading…</p>
          ) : teams.length === 0 ? (
            <p className="text-xs text-slate-400">
              Use the form above to create your first team.
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-50">
                      {team.name}{" "}
                      {team.is_primary && (
                        <span className="ml-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                          Primary
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {[
                        team.sport,
                        team.gender,
                        team.level,
                        team.code ? `(${team.code})` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Team ID:{" "}
                      <span className="font-mono text-[11px]">
                        {team.id}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTeamId(team.id);
                        if (programId) {
                          void loadSeasons(programId, team.id);
                        }
                      }}
                      className="rounded-full border border-slate-600 bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:border-slate-400"
                    >
                      Manage seasons
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Seasons panel for selected team */}
        {selectedTeam && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-50">
                  Seasons for {selectedTeam.name}
                </h2>
                <p className="text-[11px] text-slate-400">
                  Define academic years and seasonal slices for this team, then manage rosters.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedTeamId(null);
                  setSeasonsData(null);
                  setSeasonsError(null);
                }}
                className="text-[11px] text-slate-400 hover:text-slate-200"
              >
                Close
              </button>
            </div>

            {seasonsError && (
              <div className="rounded border border-red-500/40 bg-red-950/60 px-3 py-2 text-xs text-red-100">
                {seasonsError}
              </div>
            )}

            {/* Create season */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 space-y-3">
              <h3 className="text-xs font-semibold text-slate-50">
                Add season for this team
              </h3>
              <form
                onSubmit={handleCreateSeason}
                className="space-y-3 text-xs"
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-slate-200">
                      Academic year
                    </label>
                    <input
                      className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-50 placeholder:text-slate-500"
                      placeholder="e.g. 2024-25"
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-slate-200">
                      Year start
                    </label>
                    <input
                      className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-50 placeholder:text-slate-500"
                      placeholder="e.g. 2024"
                      value={yearStart}
                      onChange={(e) => setYearStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-slate-200">
                      Year end
                    </label>
                    <input
                      className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-50 placeholder:text-slate-500"
                      placeholder="Optional, e.g. 2025"
                      value={yearEnd}
                      onChange={(e) => setYearEnd(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-slate-200">
                      Season label
                    </label>
                    <input
                      className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-50 placeholder:text-slate-500"
                      placeholder="e.g. Cross Country, Indoor, Outdoor"
                      value={seasonLabel}
                      onChange={(e) => setSeasonLabel(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="isCurrentSeason"
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-slate-500 bg-slate-900 text-slate-50"
                    checked={isCurrentSeason}
                    onChange={(e) => setIsCurrentSeason(e.target.checked)}
                  />
                  <label
                    htmlFor="isCurrentSeason"
                    className="text-[11px] text-slate-200 select-none"
                  >
                    Mark as current season
                  </label>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={creatingSeason}
                    className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-medium text-slate-900 shadow disabled:opacity-60"
                  >
                    {creatingSeason ? "Adding…" : "Add season"}
                  </button>
                </div>
              </form>
            </div>

            {/* Seasons list */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-50">
                  Existing seasons
                </h3>
                {loadingSeasons && (
                  <p className="text-[11px] text-slate-400">Loading…</p>
                )}
              </div>

              {loadingSeasons ? (
                <p className="text-[11px] text-slate-400">Loading seasons…</p>
              ) : !seasonsData || seasonsData.seasons.length === 0 ? (
                <p className="text-[11px] text-slate-400">
                  No seasons defined yet for this team.
                </p>
              ) : (
                <div className="space-y-1">
                  {seasonsData.seasons.map((seasonRow) => (
                    <div
                      key={seasonRow.id}
                      className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-[11px] sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium text-slate-50">
                          {seasonRow.academic_year} – {seasonRow.season_label}{" "}
                          {seasonRow.is_current && (
                            <span className="ml-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-300">
                              Current
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Years: {seasonRow.year_start}
                          {seasonRow.year_end
                            ? `–${seasonRow.year_end}`
                            : ""}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Season ID:{" "}
                          <span className="font-mono text-[11px]">
                            {seasonRow.id}
                          </span>
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/programs/${seasonRow.program_id}/teams/${seasonRow.team_id}/seasons/${seasonRow.id}/roster`}
                          className="rounded-full border border-slate-600 bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:border-slate-400"
                        >
                          Manage roster
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
