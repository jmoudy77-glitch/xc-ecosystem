"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export type TeamSeasonSummary = {
  id: string;
  teamId: string;
  season_label: string;
  season_year: number | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
};

type Props = {
  programId: string;
  teamId: string;
  teamName: string;
  isManager: boolean;
  seasons: TeamSeasonSummary[];
};

export default function TeamSeasonsClient({
  programId,
  teamId,
  teamName,
  isManager,
  seasons,
}: Props) {
  const router = useRouter();

  const [showAdd, setShowAdd] = useState(false);
  const [seasonLabel, setSeasonLabel] = useState("");
  const [seasonYear, setSeasonYear] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const body: any = {
        season_label: seasonLabel,
      };
      if (seasonYear) body.season_year = Number(seasonYear);
      if (startDate) body.start_date = startDate;
      if (endDate) body.end_date = endDate;

      const res = await fetch(
        `/api/programs/${programId}/teams/${teamId}/seasons`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create season");
        setSaving(false);
        return;
      }

      setSeasonLabel("");
      setSeasonYear("");
      setStartDate("");
      setEndDate("");
      setShowAdd(false);
      router.refresh();
    } catch (err: any) {
      console.error("[TeamSeasonsClient] create error:", err);
      setError(err?.message || "Unexpected error creating season");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-100">
            {teamName}
          </h1>
          <p className="mt-1 text-[11px] text-slate-500">
            Manage seasons and rosters for this team.
          </p>
        </div>

        {isManager && (
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="rounded-full bg-sky-600 px-3 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-sky-500"
          >
            {showAdd ? "Cancel" : "Add season"}
          </button>
        )}
      </div>

      {error && (
        <p className="text-[11px] text-rose-400">{error}</p>
      )}

      {/* Add season form */}
      {isManager && showAdd && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-3 text-sm"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-300">
                Season label<span className="text-rose-400">*</span>
              </label>
              <input
                required
                value={seasonLabel}
                onChange={(e) => setSeasonLabel(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                placeholder="2025 XC, 2026 Indoor, etc."
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-300">
                Season year
              </label>
              <input
                value={seasonYear}
                onChange={(e) => setSeasonYear(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                placeholder="2025"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-300">
                Start date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-300">
                End date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-sky-600 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-sky-500 disabled:opacity-60"
          >
            {saving ? "Creating…" : "Create season"}
          </button>
        </form>
      )}

      {/* Seasons list */}
      <section className="space-y-2">
        {seasons.length === 0 ? (
          <p className="text-sm text-slate-500">
            No seasons created yet. Use &quot;Add season&quot; to start building rosters.
          </p>
        ) : (
          <div className="space-y-2">
            {seasons.map((season) => (
              <Link
                key={season.id}
                href={`/programs/${programId}/teams/${teamId}/seasons/${season.id}`}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 hover:border-sky-600 hover:bg-slate-900/80"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-100">
                    {season.season_label}
                  </span>
                  <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-slate-400">
                    {season.season_year && (
                      <span className="rounded-full border border-slate-700 px-2 py-[1px]">
                        {season.season_year}
                      </span>
                    )}
                    {season.start_date && (
                      <span className="rounded-full border border-slate-700 px-2 py-[1px]">
                        Starts {season.start_date}
                      </span>
                    )}
                    {season.end_date && (
                      <span className="rounded-full border border-slate-700 px-2 py-[1px]">
                        Ends {season.end_date}
                      </span>
                    )}
                    {season.is_active && (
                      <span className="rounded-full border border-emerald-600 px-2 py-[1px] text-emerald-200">
                        Active
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-slate-400">
                  View roster →
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}