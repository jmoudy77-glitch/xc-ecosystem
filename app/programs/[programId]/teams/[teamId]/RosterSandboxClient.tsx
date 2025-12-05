"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Scenario = {
  id: string;
  name: string;
  target_season_label: string | null;
  target_season_year: number | null;
  notes: string | null;
  created_at: string;
};

type Props = {
  programId: string;
  teamId: string;
  isManager: boolean;
};

function isUuidLike(id: string): boolean {
  return /^[0-9a-fA-F-]{36}$/.test(id);
}

export default function RosterSandboxClient({
  programId,
  teamId,
  isManager,
}: Props) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [targetSeasonLabel, setTargetSeasonLabel] = useState("");
  const [targetSeasonYear, setTargetSeasonYear] = useState<string>("");
  const [notes, setNotes] = useState("");

  const router = useRouter();

  async function loadScenarios() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/programs/${programId}/teams/${teamId}/roster-scenarios`
      );
      const body = await res.json();

      if (!res.ok) {
        setError(body.error || "Failed to load scenarios");
        setLoading(false);
        return;
      }

      setScenarios(body.scenarios || []);
    } catch (e: any) {
      setError(e?.message || "Unexpected error");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadScenarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/programs/${programId}/teams/${teamId}/roster-scenarios`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            target_season_label: targetSeasonLabel.trim() || null,
            target_season_year: targetSeasonYear
              ? Number(targetSeasonYear)
              : null,
            notes: notes.trim() || null,
          }),
        }
      );

      const body = await res.json();

      if (!res.ok) {
        setError(body.error || "Failed to create scenario");
        setCreating(false);
        return;
      }

      const created: Scenario = body.scenario;

      // Clear form
      setName("");
      setTargetSeasonLabel("");
      setTargetSeasonYear("");
      setNotes("");

      // Add to local list so it shows under "Existing scenarios"
      setScenarios((prev) => [created, ...prev]);

      // Only navigate if the ID looks like a real UUID (36 chars, hex + dashes)
      if (isUuidLike(created.id)) {
        router.push(
          `/programs/${programId}/teams/${teamId}/scenarios/${created.id}`
        );
      } else {
        console.log(
          "[RosterSandbox] Created non-persisted scenario stub, staying on page:",
          created.id
        );
      }
    } catch (e: any) {
      setError(e?.message || "Unexpected error");
    }

    setCreating(false);
  }

  function handleOpenScenario(sc: Scenario) {
    if (!isUuidLike(sc.id)) {
      console.log(
        "[RosterSandbox] Scenario has non-UUID id; probably stubbed only:",
        sc.id
      );
      return;
    }

    router.push(
      `/programs/${programId}/teams/${teamId}/scenarios/${sc.id}`
    );
  }

  return (
    <div className="mt-3 space-y-4">
      {error && (
        <p className="text-[11px] text-rose-400">{error}</p>
      )}

      {isManager ? (
        <form
          onSubmit={handleCreate}
          className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/70 p-3"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            New scenario
          </p>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-400">
              Scenario name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="2026 XC scholarship projection"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] text-slate-400">
                Target season label (optional)
              </label>
              <input
                value={targetSeasonLabel}
                onChange={(e) => setTargetSeasonLabel(e.target.value)}
                placeholder="Fall 2026"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500"
              />
            </div>
            <div className="w-24 space-y-1">
              <label className="text-[10px] text-slate-400">
                Year
              </label>
              <input
                value={targetSeasonYear}
                onChange={(e) => setTargetSeasonYear(e.target.value)}
                placeholder="2026"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-400">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Assumes current sophomores all return, plus 3 new distance recruits…"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500"
            />
          </div>

          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="mt-1 rounded-md bg-sky-600 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-sky-500 disabled:opacity-60"
          >
            {creating ? "Creating…" : "Create scenario"}
          </button>
        </form>
      ) : (
        <p className="text-[11px] text-slate-500">
          Only head coaches / admins can create roster scenarios.
        </p>
      )}

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Existing scenarios
        </p>

        {loading ? (
          <p className="text-[11px] text-slate-500">Loading scenarios…</p>
        ) : scenarios.length === 0 ? (
          <p className="text-[11px] text-slate-500">
            No roster scenarios yet. Create one to begin planning.
          </p>
        ) : (
          <div className="space-y-2">
            {scenarios.map((sc) => (
              <button
                key={sc.id}
                onClick={() => handleOpenScenario(sc)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-left hover:bg-slate-800/60"
              >
                <div>
                  <p className="text-sm font-medium text-slate-100">
                    {sc.name}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {sc.target_season_label ||
                      (sc.target_season_year
                        ? `Season ${sc.target_season_year}`
                        : "No target year")}
                  </p>
                </div>
                <span className="text-[10px] text-slate-500">
                  {new Date(sc.created_at).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}