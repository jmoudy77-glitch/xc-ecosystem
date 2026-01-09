// app/programs/[programId]/teams/[teamId]/RosterSandboxClient.tsx

"use client";

import * as React from "react";
import RecruitingPrimarySurfaceSkeleton from "@/app/programs/[programId]/teams/[teamId]/(administration)/roster-planning/_components/RecruitingPrimarySurfaceSkeleton";

type Sport = "xc" | "tf";

type SlotRow = {
  eventGroupKey: string;
  slotId: string;
  label: string;
  primaryAthleteId: string | null;
  primaryAthleteName: string | null;
  primaryAthleteAvatarUrl: string | null;
  primaryAthleteType: "returning" | "recruit" | null;
  secondaryAthletes: Array<{
    athleteId: string;
    name: string | null;
    avatarUrl: string | null;
    athleteType: "returning" | "recruit";
  }>;
};

export default function RosterSandboxClient({
  programId,
  teamId,
  teamSeasonId,
  sport,
}: {
  programId: string;
  teamId: string;
  teamSeasonId: string | null;
  sport: Sport | null;
}) {
  const [isLocked, setIsLocked] = React.useState<boolean>(false);
  const [rows, setRows] = React.useState<SlotRow[]>([]);
  const [busy, setBusy] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const canOperate = Boolean(teamSeasonId && sport);

  async function postJson<T>(url: string, body: any): Promise<T> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok || json?.ok === false) {
      const msg = json?.error || `Request failed (${res.status})`;
      throw new Error(msg);
    }
    return json as T;
  }

  async function loadStateAndRows(nextLock?: boolean) {
    if (!canOperate) return;

    const lockResp = await postJson<{ ok: true; data: { is_locked: boolean } }>(
      "/api/roster-planning/lock/read",
      { programId, teamId, teamSeasonId }
    );

    const locked = typeof nextLock === "boolean" ? nextLock : Boolean(lockResp.data?.is_locked);
    setIsLocked(locked);

    const readResp = await postJson<{ ok: true; data: any[] }>(
      "/api/roster-planning/slots/read",
      { programId, teamSeasonId, sport }
    );

    const mapped: SlotRow[] = (readResp.data ?? []).map((r: any) => {
      const primary = r.primary ?? null;
      const secondaries = Array.isArray(r.secondaries) ? r.secondaries : [];
      return {
        eventGroupKey: String(r.event_group_key ?? ""),
        slotId: String(r.slot_id ?? ""),
        label: String(r.slot_label ?? "Slot"),
        primaryAthleteId: primary?.athlete_id ?? null,
        primaryAthleteName: primary?.name ?? null,
        primaryAthleteAvatarUrl: primary?.avatar_url ?? null,
        primaryAthleteType: primary?.athlete_type ?? null,
        secondaryAthletes: secondaries.map((s: any) => ({
          athleteId: String(s.athlete_id ?? ""),
          name: s.name ?? null,
          avatarUrl: s.avatar_url ?? null,
          athleteType: s.athlete_type as "returning" | "recruit",
        })),
      };
    });

    setRows(mapped);
  }

  async function syncFromRecruiting() {
    if (!canOperate) return;
    await postJson<{ ok: true }>(
      "/api/roster-planning/sync",
      { programId, teamId, teamSeasonId, sport }
    );
  }

  React.useEffect(() => {
    let cancelled = false;

    async function boot() {
      setError(null);

      if (!teamSeasonId) {
        setRows([]);
        setIsLocked(false);
        return;
      }
      if (!sport) {
        setRows([]);
        setIsLocked(false);
        return;
      }

      setBusy(true);
      try {
        // If unlocked, sync-on-open from Recruiting before reading.
        const lockResp = await postJson<{ ok: true; data: { is_locked: boolean } }>(
          "/api/roster-planning/lock/read",
          { programId, teamId, teamSeasonId }
        );

        const locked = Boolean(lockResp.data?.is_locked);
        if (!locked) {
          await syncFromRecruiting();
        }

        if (!cancelled) {
          await loadStateAndRows(locked);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load roster planning.");
      } finally {
        if (!cancelled) setBusy(false);
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId, teamId, teamSeasonId, sport]);

  async function onToggleLock(nextLocked: boolean) {
    if (!canOperate) return;
    setError(null);
    setBusy(true);
    try {
      if (!nextLocked) {
        const ok = window.confirm("Unlock roster planning?\n\nSync with Recruiting now?");
        if (ok) await syncFromRecruiting();
      }

      await postJson<{ ok: true }>(
        "/api/roster-planning/lock/set",
        { programId, teamId, teamSeasonId, isLocked: nextLocked }
      );

      await loadStateAndRows(nextLocked);
    } catch (e: any) {
      setError(e?.message || "Failed to update lock state.");
    } finally {
      setBusy(false);
    }
  }

  async function onReorderWithinSlot(slotId: string, orderedAthleteIds: string[]) {
    if (!canOperate) return;
    setError(null);

    setRows((prev) =>
      prev.map((r) => {
        if (r.slotId !== slotId) return r;
        const byId = new Map(r.secondaryAthletes.map((a) => [a.athleteId, a]));
        const next = orderedAthleteIds.map((id) => byId.get(id)).filter(Boolean) as SlotRow["secondaryAthletes"];
        return { ...r, secondaryAthletes: next };
      })
    );

    try {
      await postJson<{ ok: true }>(
        "/api/roster-planning/slots/reorder",
        { programId, teamId, teamSeasonId, slotId, orderedAthleteIds }
      );
    } catch (e: any) {
      setError(e?.message || "Failed to persist reorder.");
      await loadStateAndRows();
    }
  }

  if (!teamSeasonId) {
    return (
      <div className="p-6 text-sm text-muted">
        Select a Team + Season in the top-right header to open Roster Planning.
      </div>
    );
  }

  if (!sport) {
    return (
      <div className="p-6 text-sm text-muted">
        Roster Planning is unavailable for this program because the program sport is not supported.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="text-sm font-medium text-[var(--text)]">Roster Planning</div>

        <div className="flex items-center gap-2">
          {error ? <div className="text-xs text-red-400">{error}</div> : null}

          <button
            type="button"
            className="rounded-full border border-subtle bg-panel px-3 py-1 text-xs text-[var(--text)] hover:bg-panel-muted disabled:opacity-50"
            onClick={() => onToggleLock(!isLocked)}
            disabled={busy}
            aria-label={isLocked ? "Unlock roster planning" : "Lock roster planning"}
          >
            {isLocked ? "Locked" : "Unlocked"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <RecruitingPrimarySurfaceSkeleton
          rows={rows.map((r) => ({
            eventGroupKey: r.eventGroupKey,
            slotId: r.slotId,
            label: r.label,
            primaryAthlete: r.primaryAthleteId
              ? {
                  athleteId: r.primaryAthleteId,
                  name: r.primaryAthleteName,
                  avatarUrl: r.primaryAthleteAvatarUrl,
                  athleteType: r.primaryAthleteType as any,
                }
              : null,
            secondaryAthletes: r.secondaryAthletes.map((a) => ({
              athleteId: a.athleteId,
              name: a.name,
              avatarUrl: a.avatarUrl,
              athleteType: a.athleteType,
            })),
          }))}
          onReorderWithinSlot={onReorderWithinSlot}
          busy={busy}
        />
      </div>
    </div>
  );
}
