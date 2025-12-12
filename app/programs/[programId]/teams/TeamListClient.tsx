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
        const message =
          (body && typeof body.error === "string" && body.error) ||
          `Failed to create team (HTTP ${res.status})`;
        setError(message);
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
          <p className="mt-1 text-[11px] text-muted">
            Create and manage the teams that make up this program.
          </p>
        </div>

        {isManager && (
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="inline-flex items-center rounded-full border border-subtle bg-surface/70 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:bg-brand-soft"
          >
            {showAdd ? "Cancel" : "+ Add team"}
          </button>
        )}
      </div>

      {/* Add team form */}
      {isManager && showAdd && (
        <section className="rounded-xl border border-subtle bg-surface p-4 space-y-3">
          <div>
            <p className="text-xs font-semibold text-slate-100">
              New team
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Create a logical team container (e.g. &quot;Men&apos;s
              XC&quot;, &quot;Women&apos;s Track &amp; Field&quot;) that
              will hold seasons, rosters, and scholarship budgets.
            </p>
          </div>

          {error && (
            <div className="rounded-md border border-red-500/40 bg-red-950/50 px-3 py-2 text-[11px] text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-3 text-[11px]">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="block font-medium text-slate-100">
                  Team name
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Men's Cross Country"
                  className="w-full rounded-md border border-subtle bg-surface px-2 py-1 text-xs text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-medium text-slate-100">
                  Short code
                </label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. MXC"
                  className="w-full rounded-md border border-subtle bg-surface px-2 py-1 text-xs text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-medium text-slate-100">
                  Sport
                </label>
                <input
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
                  placeholder="e.g. XC, Track"
                  className="w-full rounded-md border border-subtle bg-surface px-2 py-1 text-xs text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-medium text-slate-100">
                  Gender
                </label>
                <input
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  placeholder="e.g. Men, Women, Coed"
                  className="w-full rounded-md border border-subtle bg-surface px-2 py-1 text-xs text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-medium text-slate-100">
                  Level
                </label>
                <input
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  placeholder="e.g. NAIA, NCAA D2"
                  className="w-full rounded-md border border-subtle bg-surface px-2 py-1 text-xs text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-medium text-slate-100">
                  Season label
                </label>
                <input
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  placeholder="e.g. 2025, 2025–26"
                  className="w-full rounded-md border border-subtle bg-surface px-2 py-1 text-xs text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAdd(false);
                  setError(null);
                }}
                className="rounded-full border border-subtle px-3 py-1.5 text-[11px] text-muted hover:bg-surface/70"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="rounded-full bg-brand px-4 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-brand-soft disabled:opacity-50"
              >
                {saving ? "Creating…" : "Create team"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Teams list */}
      <section className="space-y-3">
        {teams.length === 0 ? (
          <div className="rounded-xl border border-subtle bg-surface px-4 py-3 text-[11px] text-muted">
            No teams yet.{" "}
            {isManager ? "Create your first team to get started." : "A coach will add teams for this program."}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => {
              const tags: string[] = [];

              if (team.sport) tags.push(team.sport);
              if (team.gender) tags.push(team.gender);
              if (team.level) tags.push(team.level);
              if (team.season) tags.push(team.season);

              return (
                <div
                  key={team.id}
                  className="flex h-full flex-col justify-between rounded-xl border border-subtle bg-surface p-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-100">
                          {team.name}
                        </p>
                        {team.code && (
                          <p className="text-[11px] text-muted">
                            Code:{" "}
                            <span className="font-mono text-[11px]">
                              {team.code}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>

                    {tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-muted">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-subtle px-2 py-0.5"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px]">
                    <p className="text-muted">
                      Manage seasons, rosters, and scholarships.
                    </p>
                    <Link
                      href={`/programs/${programId}/teams/${team.id}`}
                      className="rounded-full border border-subtle px-2 py-1 text-[11px] text-slate-100 hover:bg-brand-soft"
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