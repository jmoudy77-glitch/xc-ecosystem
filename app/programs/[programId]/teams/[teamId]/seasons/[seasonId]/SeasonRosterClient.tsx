"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type RosterEntry = {
  id: string;
  athleteId: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  status: string;
  role: string | null;
  programRecruitId: string | null;
};

export type RecruitOption = {
  programRecruitId: string;
  athleteId: string | null;
  label: string;
  email: string | null;
  avatarUrl: string | null;
  status: string;
  source: string;
  profileType: string;
};

type Props = {
  programId: string;
  teamId: string;
  seasonId: string;
  isManager: boolean;
  isLocked: boolean;
  roster: RosterEntry[];
};

export default function SeasonRosterClient({
  programId,
  teamId,
  seasonId,
  isManager,
  isLocked,
  roster,
}: Props) {
  const router = useRouter();

  const [recruits, setRecruits] = useState<RecruitOption[]>([]);
  const [recruitsLoaded, setRecruitsLoaded] = useState(false);
  const [loadingRecruits, setLoadingRecruits] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // program_recruit_ids already on this season's roster
  const rosteredRecruitIds = new Set(
    roster
      .map((r) => r.programRecruitId)
      .filter((id): id is string => !!id)
  );

  async function loadRecruits() {
    if (recruitsLoaded || loadingRecruits) return;
    setLoadingRecruits(true);
    setError(null);

    try {
      const res = await fetch(`/api/programs/${programId}/recruits`);
      const body = await res.json();

      if (!res.ok) {
        setError(body.error || `Failed to load recruits (HTTP ${res.status})`);
        setLoadingRecruits(false);
        return;
      }

      const raw: any[] = body.recruits ?? body ?? [];

      console.log("[SeasonRosterClient] recruits payload (raw):", raw);

      const all: RecruitOption[] = raw.map((r: any, index: number) => {
        // API is already giving us programRecruitId, status, source, profileType, athleteId
        const programRecruitId: string =
          r.programRecruitId ?? r.program_recruit_id ?? r.id ?? "";

        // Try to derive some kind of human-friendly label
        const nameParts = [r.first_name, r.last_name]
          .filter(Boolean)
          .join(" ")
          .trim();

        let label: string =
          r.label ??
          r.name ??
          (nameParts.length > 0 ? nameParts : "") ??
          "";

        // Fallback if nothing is available
        if (!label || label.trim().length === 0) {
          label = programRecruitId
            ? `Recruit ${String(index + 1).padStart(2, "0")}`
            : "Recruit";
        }

        return {
          programRecruitId,
          athleteId: r.athleteId ?? r.athlete_id ?? null,
          label,
          email: r.email ?? null,
          avatarUrl: r.avatarUrl ?? null,
          status: r.status ?? "active",
          source: r.source ?? "unknown",
          profileType: r.profileType ?? r.profile_type ?? "hs",
        };
      });

      // Filter out recruits already rostered for this season
      const available = all.filter(
        (rec) => !rosteredRecruitIds.has(rec.programRecruitId)
      );

      console.log("[SeasonRosterClient] mapped recruits:", available);

      setRecruits(available);
      setRecruitsLoaded(true);
      setLoadingRecruits(false);
    } catch (err: any) {
      console.error("[SeasonRosterClient] loadRecruits error:", err);
      setError(err?.message || "Unexpected error loading recruits");
      setLoadingRecruits(false);
    }
  }

  async function handleAdd(programRecruitId: string) {
    setAddingId(programRecruitId);
    setError(null);

    try {
      const res = await fetch(
        `/api/programs/${programId}/teams/${teamId}/seasons/${seasonId}/roster/add-recruit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            program_recruit_id: programRecruitId,
          }),
        }
      );

      const body = await res.json();

      if (!res.ok) {
        setError(body.error || `Failed to add athlete (HTTP ${res.status})`);
        setAddingId(null);
        return;
      }

      // Locally remove the added recruit from the list
      setRecruits((prev) =>
        prev.filter((r) => r.programRecruitId !== programRecruitId)
      );

      setAddingId(null);
      router.refresh();
    } catch (err: any) {
      console.error("[SeasonRosterClient] handleAdd error:", err);
      setError(err?.message || "Unexpected error adding athlete");
      setAddingId(null);
    }
  }

  return (
    <section className="grid gap-4 md:grid-cols-3">
      {/* Left: roster list */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 md:col-span-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Season roster
        </p>

        {error && (
          <p className="mt-2 text-[11px] text-rose-400">{error}</p>
        )}

        {roster.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No athletes have been added to this roster yet.
            {isManager &&
              " Use the panel on the right to add signed / enrolled recruits."}
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {roster.map((entry) => {
              const displayLabel = entry.name || entry.email || "Athlete";
              const initials = displayLabel
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
                          alt={displayLabel}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-100">
                        {displayLabel}
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
      </div>

      {/* Right: Add from recruits */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Add from recruits
        </p>
        <p className="text-[11px] text-slate-500">
          This list shows recruits for this program who are marked as signed,
          enrolled, committed, or walk-ons. Adding them here will place them on
          this season&apos;s roster.
        </p>

        {isManager ? (
          isLocked ? (
            <p className="mt-2 text-[11px] text-amber-400">
              Roster changes are locked for this season per your conference
              requirements. You can still view the roster, but cannot add
              additional recruits.
            </p>
          ) : (
            <>
              {!recruitsLoaded ? (
                <button
                  type="button"
                  onClick={loadRecruits}
                  disabled={loadingRecruits}
                  className="mt-1 rounded-md bg-sky-600 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-sky-500 disabled:opacity-60"
                >
                  {loadingRecruits ? "Loading recruits…" : "Load eligible recruits"}
                </button>
              ) : recruits.length === 0 ? (
                <p className="mt-2 text-[11px] text-slate-500">
                  No roster-eligible recruits found yet, or all eligible recruits
                  are already on this season&apos;s roster. Mark recruits as
                  signed, enrolled, committed, or walk-on in your recruiting
                  board to see them here.
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  {recruits.map((rec) => {
                    const displayLabel = rec.label || "Recruit";
                    const initials = displayLabel
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <div
                        key={rec.programRecruitId}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/80 px-2 py-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-slate-800 text-[10px] font-semibold text-slate-100">
                            {rec.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={rec.avatarUrl}
                                alt={displayLabel}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span>{initials}</span>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-slate-100">
                              {displayLabel}
                            </span>
                            {rec.email && (
                              <span className="text-[10px] text-slate-400">
                                {rec.email}
                              </span>
                            )}
                            <div className="mt-1 flex flex-wrap gap-1 text-[9px] text-slate-400">
                              <span className="rounded-full border border-slate-700 px-2 py-[1px]">
                                {rec.profileType}
                              </span>
                              <span className="rounded-full border border-slate-700 px-2 py-[1px]">
                                {rec.status}
                              </span>
                              <span className="rounded-full border border-slate-700 px-2 py-[1px]">
                                {rec.source}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAdd(rec.programRecruitId)}
                          disabled={addingId === rec.programRecruitId}
                          className="rounded-md border border-sky-500 px-2 py-1 text-[10px] font-semibold text-sky-200 hover:bg-sky-600/10 disabled:opacity-60"
                        >
                          {addingId === rec.programRecruitId
                            ? "Adding…"
                            : "Add to roster"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )
        ) : (
          <p className="mt-2 text-[11px] text-slate-500">
            Only head coaches / admins can add recruits to the roster.
          </p>
        )}
      </div>
    </section>
  );
}