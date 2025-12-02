// app/programs/[programId]/teams/page.tsx
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";

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

type TeamsResponse = {
  programId: string;
  teams: Team[];
};

type TeamSeason = {
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

type TeamSeasonsResponse = {
  programId: string;
  teamId: string;
  seasons: TeamSeason[];
};

export default function ProgramTeamsPage() {
  const params = useParams();
  const programId = params?.programId as string | undefined;

  const [data, setData] = useState<TeamsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sport, setSport] = useState("");
  const [gender, setGender] = useState("");
  const [level, setLevel] = useState("");
  const [season, setSeason] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [creating, setCreating] = useState(false);

  // Seasons state
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [seasons, setSeasons] = useState<TeamSeason[]>([]);
  const [seasonsLoading, setSeasonsLoading] = useState(false);
  const [seasonsError, setSeasonsError] = useState<string | null>(null);

  const [academicYear, setAcademicYear] = useState("");
  const [yearStart, setYearStart] = useState("");
  const [yearEnd, setYearEnd] = useState("");
  const [seasonLabel, setSeasonLabel] = useState("");
  const [isCurrent, setIsCurrent] = useState(false);
  const [creatingSeason, setCreatingSeason] = useState(false);

  async function loadTeams(currentProgramId: string) {
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/programs/${currentProgramId}/teams`);
      const body = (await res.json().catch(() => ({}))) as TeamsResponse & {
        error?: string;
      };

      if (!res.ok) {
        setErrorMsg(body.error || `Failed to load teams (HTTP ${res.status})`);
        setData(null);
        return;
      }

      setData({
        programId: body.programId,
        teams: body.teams || [],
      });
    } catch (err: any) {
      console.error("[ProgramTeamsPage] loadTeams error:", err);
      setErrorMsg(err?.message || "Unexpected error loading teams");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadSeasons(currentProgramId: string, team: Team) {
    setSelectedTeam(team);
    setSeasons([]);
    setSeasonsError(null);
    setSeasonsLoading(true);

    try {
      const res = await fetch(
        `/api/programs/${currentProgramId}/teams/${team.id}/seasons`,
      );
      const body = (await res
        .json()
        .catch(() => ({}))) as TeamSeasonsResponse & { error?: string };

      if (!res.ok) {
        setSeasonsError(
          body.error || `Failed to load seasons (HTTP ${res.status})`,
        );
        setSeasons([]);
        return;
      }

      setSeasons(body.seasons || []);
    } catch (err: any) {
      console.error("[ProgramTeamsPage] loadSeasons error:", err);
      setSeasonsError(err?.message || "Unexpected error loading seasons");
      setSeasons([]);
    } finally {
      setSeasonsLoading(false);
    }
  }

  useEffect(() => {
    if (!programId) return;
    void loadTeams(programId);
  }, [programId]);

  async function handleCreateTeam(e: FormEvent) {
    e.preventDefault();
    if (!programId) return;

    setCreating(true);
    setErrorMsg(null);

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

      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!res.ok) {
        setErrorMsg(body.error || `Failed to create team (HTTP ${res.status})`);
        return;
      }

      // Reset form and reload
      setName("");
      setCode("");
      setSport("");
      setGender("");
      setLevel("");
      setSeason("");
      setIsPrimary(false);

      await loadTeams(programId);
    } catch (err: any) {
      console.error("[ProgramTeamsPage] create team error:", err);
      setErrorMsg(err?.message || "Unexpected error creating team");
    } finally {
      setCreating(false);
    }
  }

  async function handleCreateSeason(e: FormEvent) {
    e.preventDefault();
    if (!programId || !selectedTeam) return;

    setCreatingSeason(true);
    setSeasonsError(null);

    try {
      const payload = {
        academicYear: academicYear.trim(),
        yearStart: Number(yearStart),
        yearEnd: yearEnd ? Number(yearEnd) : null,
        seasonLabel: seasonLabel.trim(),
        isCurrent,
      };

      const res = await fetch(
        `/api/programs/${programId}/teams/${selectedTeam.id}/seasons`,
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

      // Reset form & reload seasons
      setAcademicYear("");
      setYearStart("");
      setYearEnd("");
      setSeasonLabel("");
      setIsCurrent(false);

      await loadSeasons(programId, selectedTeam);
    } catch (err: any) {
      console.error("[ProgramTeamsPage] create season error:", err);
      setSeasonsError(err?.message || "Unexpected error creating season");
    } finally {
      setCreatingSeason(false);
    }
  }

  if (!programId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-600">Missing programId in route.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Program teams
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              Teams &amp; divisions
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Create and manage teams within this program. Use this to separate
              Cross Country vs Track &amp; Field, varsity vs JV, or seasonal
              squads.
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Program ID:{" "}
              <span className="font-mono text-[11px] text-slate-500">
                {data?.programId ?? programId}
              </span>
            </p>
          </div>
        </header>

        {errorMsg && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Create team form */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">
            Add a team or division
          </h2>
          <form onSubmit={handleCreateTeam} className="space-y-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                Team name<span className="text-red-500">*</span>
              </label>
              <input
                required
                className="border rounded px-3 py-2 text-sm w-full"
                placeholder="e.g. Men's Cross Country"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Sport
                </label>
                <input
                  className="border rounded px-3 py-2 text-sm w-full"
                  placeholder="e.g. XC, T&F"
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Gender
                </label>
                <input
                  className="border rounded px-3 py-2 text-sm w-full"
                  placeholder="e.g. Men's, Women's, Coed"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Level
                </label>
                <input
                  className="border rounded px-3 py-2 text-sm w-full"
                  placeholder="e.g. Varsity, JV"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Season
                </label>
                <input
                  className="border rounded px-3 py-2 text-sm w-full"
                  placeholder="e.g. Cross Country, Indoor, Outdoor"
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Short code
                </label>
                <input
                  className="border rounded px-3 py-2 text-sm w-full"
                  placeholder="Optional code, e.g. M-XC"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input
                  id="isPrimary"
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                />
                <label
                  htmlFor="isPrimary"
                  className="text-xs text-slate-700 select-none"
                >
                  Mark as primary team for this program
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={creating}
                className="bg-blue-600 text-white px-4 py-2 rounded shadow text-sm font-medium disabled:opacity-60"
              >
                {creating ? "Creating…" : "Create team"}
              </button>
            </div>
          </form>
        </section>

        {/* Teams list */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                Teams in this program
              </h2>
              <p className="text-[11px] text-slate-500">
                Use teams to mirror how your school splits cross country and
                track.
              </p>
            </div>
          </div>

          {loading ? (
            <p className="text-xs text-slate-500">Loading teams…</p>
          ) : !data || data.teams.length === 0 ? (
            <p className="text-xs text-slate-500">
              No teams found yet. Create your first team above.
            </p>
          ) : (
            <div className="mt-1 space-y-2">
              {data.teams.map((team) => (
                <div
                  key={team.id}
                  className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {team.name}
                      {team.is_primary && (
                        <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                          Primary
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {[team.sport, team.gender, team.level, team.season]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {team.code && (
                      <p className="text-[11px] text-slate-500">
                        Code:{" "}
                        <span className="font-mono text-[11px]">
                          {team.code}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="mt-2 flex flex-col items-start gap-1 md:mt-0 md:items-end">
                    <span className="text-[11px] text-slate-400">
                      Created at:{" "}
                      <span className="font-mono">
                        {team.created_at
                          ? new Date(team.created_at).toLocaleDateString()
                          : "—"}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        programId && loadSeasons(programId, team)
                      }
                      className="mt-1 inline-flex items-center rounded-full border border-slate-400 px-3 py-1 text-[11px] font-medium text-slate-700 hover:border-slate-500"
                    >
                      Manage seasons
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Seasons management panel */}
        {selectedTeam && (
          <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">
                  Seasons for {selectedTeam.name}
                </h2>
                <p className="text-[11px] text-slate-500">
                  Define academic years and seasons for this team, like
                  &quot;2024-25 Cross Country&quot;.
                </p>
              </div>
              <button
                type="button"
                className="text-[11px] text-slate-500 hover:underline"
                onClick={() => {
                  setSelectedTeam(null);
                  setSeasons([]);
                  setSeasonsError(null);
                }}
              >
                Close
              </button>
            </div>

            {seasonsError && (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {seasonsError}
              </div>
            )}

            <form
              onSubmit={handleCreateSeason}
              className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Academic year<span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    className="border rounded px-3 py-2 text-sm w-full"
                    placeholder="e.g. 2024-25"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Year start<span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="number"
                    className="border rounded px-3 py-2 text-sm w-full"
                    placeholder="e.g. 2024"
                    value={yearStart}
                    onChange={(e) => setYearStart(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Year end
                  </label>
                  <input
                    type="number"
                    className="border rounded px-3 py-2 text-sm w-full"
                    placeholder="e.g. 2025"
                    value={yearEnd}
                    onChange={(e) => setYearEnd(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Season label<span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    className="border rounded px-3 py-2 text-sm w-full"
                    placeholder="e.g. Cross Country"
                    value={seasonLabel}
                    onChange={(e) => setSeasonLabel(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="isCurrentSeason"
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={isCurrent}
                  onChange={(e) => setIsCurrent(e.target.checked)}
                />
                <label
                  htmlFor="isCurrentSeason"
                  className="text-xs text-slate-700 select-none"
                >
                  Mark as current season for this team
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={creatingSeason}
                  className="bg-blue-600 text-white px-4 py-2 rounded shadow text-sm font-medium disabled:opacity-60"
                >
                  {creatingSeason ? "Creating…" : "Create season"}
                </button>
              </div>
            </form>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-700">
                Existing seasons
              </h3>
              {seasonsLoading ? (
                <p className="text-xs text-slate-500">
                  Loading seasons for this team…
                </p>
              ) : seasons.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No seasons defined yet. Create one above.
                </p>
              ) : (
                <div className="space-y-1">
                  {seasons.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                    >
                      <div>
                        <p className="font-medium text-slate-800">
                          {s.academic_year} — {s.season_label}
                          {s.is_current && (
                            <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                              Current
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Years:{" "}
                          <span className="font-mono">
                            {s.year_start}
                            {s.year_end ? `–${s.year_end}` : ""}
                          </span>
                        </p>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Created:{" "}
                        <span className="font-mono">
                          {s.created_at
                            ? new Date(s.created_at).toLocaleDateString()
                            : "—"}
                        </span>
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
