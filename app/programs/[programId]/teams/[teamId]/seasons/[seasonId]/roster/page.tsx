// app/programs/[programId]/teams/[teamId]/seasons/[seasonId]/roster/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams } from "next/navigation";

type RosterEntry = {
  id: string;
  athlete_id: string;
  team_season_id: string;
  jersey_number: string | null;
  role: string | null;
  status: string | null;
  depth_order: number | null;
  notes: string | null;
  created_at: string | null;
  athlete_name?: string | null;
  athlete_grad_year?: number | null;
};

type RosterResponse = {
  programId: string;
  teamId: string;
  seasonId: string;
  roster: RosterEntry[];
  error?: string;
};

export default function TeamSeasonRosterPage() {
  const params = useParams();
  const programId = params?.programId as string | undefined;
  const teamId = params?.teamId as string | undefined;
  const seasonId = params?.seasonId as string | undefined;

  const [data, setData] = useState<RosterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [athleteId, setAthleteId] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [role, setRole] = useState("athlete");
  const [status, setStatus] = useState("active");
  const [notes, setNotes] = useState("");
  const [depthOrder, setDepthOrder] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadRoster(
    currentProgramId: string,
    currentTeamId: string,
    currentSeasonId: string,
  ) {
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(
        `/api/programs/${currentProgramId}/teams/${currentTeamId}/seasons/${currentSeasonId}/roster`,
      );
      const body = (await res
        .json()
        .catch(() => ({}))) as RosterResponse & { error?: string };

      if (!res.ok) {
        setErrorMsg(body.error || `Failed to load roster (HTTP ${res.status})`);
        setData(null);
        return;
      }

      setData(body);
    } catch (err: any) {
      console.error("[TeamSeasonRosterPage] loadRoster error:", err);
      setErrorMsg(err?.message || "Unexpected error loading roster");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!programId || !teamId || !seasonId) return;
    void loadRoster(programId, teamId, seasonId);
  }, [programId, teamId, seasonId]);

  async function handleAddToRoster(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!programId || !teamId || !seasonId) return;

    setCreating(true);
    setErrorMsg(null);

    try {
      const payload = {
        athleteId: athleteId.trim(),
        jerseyNumber: jerseyNumber.trim() || null,
        role: role.trim() || "athlete",
        status: status.trim() || "active",
        depthOrder: depthOrder ? Number(depthOrder) : null,
        notes: notes.trim() || null,
      };

      const res = await fetch(
        `/api/programs/${programId}/teams/${teamId}/seasons/${seasonId}/roster`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!res.ok) {
        setErrorMsg(
          body.error || `Failed to add athlete (HTTP ${res.status})`,
        );
        return;
      }

      // Reset form & reload roster
      setAthleteId("");
      setJerseyNumber("");
      setRole("athlete");
      setStatus("active");
      setNotes("");
      setDepthOrder("");
      await loadRoster(programId, teamId, seasonId);
    } catch (err: any) {
      console.error("[TeamSeasonRosterPage] addToRoster error:", err);
      setErrorMsg(err?.message || "Unexpected error adding athlete");
    } finally {
      setCreating(false);
    }
  }

  if (!programId || !teamId || !seasonId) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-sm text-slate-300">
          Missing programId, teamId, or seasonId in route.
        </p>
      </div>
    );
  }

  const roster = data?.roster ?? [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Team roster
            </p>
            <h1 className="text-lg font-semibold text-slate-50">
              Season roster
            </h1>
            <p className="mt-1 text-[11px] text-slate-400">
              Manage athletes assigned to this team for the selected season.
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Program:{" "}
              <span className="font-mono text-[11px] text-slate-300">
                {programId}
              </span>{" "}
              · Team:{" "}
              <span className="font-mono text-[11px] text-slate-300">
                {teamId}
              </span>{" "}
              · Season:{" "}
              <span className="font-mono text-[11px] text-slate-300">
                {seasonId}
              </span>
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
        {errorMsg && (
          <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs text-red-200">
            {errorMsg}
          </div>
        )}

        {/* Add athlete to roster (MVP: by athleteId) */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-50">
                Add athlete to roster
              </h2>
              <p className="text-[11px] text-slate-400">
                For now, add by athlete ID. Later we can upgrade this to a searchable
                picker tied to your athlete database.
              </p>
            </div>
          </div>

          <form onSubmit={handleAddToRoster} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1 md:col-span-2">
                <label className="block text-[11px] font-medium text-slate-300">
                  Athlete ID<span className="text-red-400">*</span>
                </label>
                <input
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder="Paste athlete UUID"
                  value={athleteId}
                  onChange={(e) => setAthleteId(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Jersey #
                </label>
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder="Optional"
                  value={jerseyNumber}
                  onChange={(e) => setJerseyNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Role
                </label>
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder="e.g. athlete, manager"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Status
                </label>
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder="e.g. active, injured, redshirt"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-300">
                  Depth order
                </label>
                <input
                  type="number"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder="Optional"
                  value={depthOrder}
                  onChange={(e) => setDepthOrder(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-300">
                Notes
              </label>
              <textarea
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                rows={2}
                placeholder="Optional notes about this roster spot"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center gap-1 rounded-full bg-sky-500 px-4 py-1.5 text-[11px] font-semibold text-slate-950 shadow-sm hover:bg-sky-400 disabled:opacity-60"
              >
                {creating ? "Adding…" : "Add to roster"}
              </button>
            </div>
          </form>
        </section>

        {/* Roster list */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div>
              <h2 className="text-sm font-semibold text-slate-50">
                Current roster
              </h2>
              <p className="text-[11px] text-slate-400">
                {loading
                  ? "Loading roster…"
                  : `This season has ${roster.length} athlete${
                      roster.length === 1 ? "" : "s"
                    } on the roster.`}
              </p>
            </div>
          </div>

          {loading ? (
            <p className="text-[11px] text-slate-400">Loading…</p>
          ) : roster.length === 0 ? (
            <p className="text-[11px] text-slate-400">
              No athletes on this roster yet. Add one above.
            </p>
          ) : (
            <div className="mt-2 space-y-1">
              {roster.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-medium text-slate-50">
                      {r.athlete_name || "(Unnamed athlete)"}{" "}
                      {r.athlete_grad_year && (
                        <span className="text-[11px] text-slate-400">
                          · {r.athlete_grad_year}
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      ID:{" "}
                      <span className="font-mono text-[11px] text-slate-300">
                        {r.athlete_id}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {[
                        r.jersey_number ? `#${r.jersey_number}` : null,
                        r.role,
                        r.status,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {r.notes && (
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {r.notes}
                      </p>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 text-right">
                    <div>
                      Added:{" "}
                      <span className="font-mono text-[11px] text-slate-300">
                        {r.created_at
                          ? new Date(r.created_at).toLocaleDateString()
                          : "—"}
                      </span>
                    </div>
                    {typeof r.depth_order === "number" && (
                      <div className="mt-0.5">
                        Depth:{" "}
                        <span className="font-mono text-[11px] text-slate-300">
                          {r.depth_order}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
