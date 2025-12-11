"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export type TeamSummary = {
  id: string;
  programId: string;
  name: string;
  code: string | null;
  sport: string | null;
  gender: string | null;
  level: string | null;
  season: string | null;
};

type Props = {
  programId: string;
  isManager: boolean;
  teams: TeamSummary[];
};

export default function TeamListClient({
  programId,
  isManager,
  teams,
}: Props) {
  const router = useRouter();

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [sport, setSport] = useState("");
  const [gender, setGender] = useState("");
  const [level, setLevel] = useState("");
  const [season, setSeason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/programs/${programId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          code: code || null,
          sport: sport || null,
          gender: gender || null,
          level: level || null,
          season: season || null,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        setError(body.error || `Failed to create team (HTTP ${res.status})`);
        setSaving(false);
        return;
      }

      setName("");
      setCode("");
      setSport("");
      setGender("");
      setLevel("");
      setSeason("");
      setShowAdd(false);
      router.refresh();
    } catch (err: any) {
      console.error("[TeamListClient] create team error:", err);
      setError(err?.message || "Unexpected error creating team");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Your teams
          </h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Create and manage the teams that make up this program.
          </p>
        </div>

        {isManager && (
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="rounded-full bg-sky-600 px-3 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-sky-500"
          >
            {showAdd ? "Cancel" : "Add team"}
          </button>
        )}
      </div>

      {error && (
        <p className="text-[11px] text-rose-400">
          {error}
        </p>
      )}

      {/* Add team form */}
      {isManager && showAdd && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-3 text-sm"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-300">
                Team name<span className="text-rose-400">*</span>
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                placeholder="Men's Cross Country"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-300">Short code</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                placeholder="M-XC"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-300">Sport</label>
              <input
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                placeholder="Cross Country"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-300">Gender</label>
              <input
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                placeholder="Men / Women / Coed"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-300">Level</label>
              <input
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                placeholder="Varsity / JV / Developmental"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-300">Season label</label>
              <input
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                placeholder="2025 XC, 2026 Indoor, etc."
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-sky-600 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-sky-500 disabled:opacity-60"
          >
            {saving ? "Creating…" : "Create team"}
          </button>
        </form>
      )}

      {/* Teams list */}
      <section className="space-y-2">
        {teams.length === 0 ? (
          <p className="text-sm text-slate-500">
            No teams created yet. Use &quot;Add team&quot; to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {teams.map((team) => {
              const initials =
                (team.code ||
                  team.name ||
                  "T")
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 3)
                  .toUpperCase();

              return (
                <div
                  key={team.id}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-100">
                      {initials}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-100">
                        {team.name}
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-slate-400">
                        {team.sport && (
                          <span className="rounded-full border border-slate-700 px-2 py-[1px]">
                            {team.sport}
                          </span>
                        )}
                        {team.gender && (
                          <span className="rounded-full border border-slate-700 px-2 py-[1px]">
                            {team.gender}
                          </span>
                        )}
                        {team.level && (
                          <span className="rounded-full border border-slate-700 px-2 py-[1px]">
                            {team.level}
                          </span>
                        )}
                        {team.season && (
                          <span className="rounded-full border border-slate-700 px-2 py-[1px]">
                            {team.season}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                    <div className="flex items-center gap-2 text-[11px]">
                        <Link
                        href={`/programs/${programId}/teams/${team.id}`}
                        className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-slate-300 hover:border-sky-500 hover:text-sky-200"
                        >
                        Seasons &amp; rosters →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}