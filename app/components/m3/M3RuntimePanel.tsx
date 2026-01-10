"use client";

import * as React from "react";

type M3RuntimeMode = "inactive" | "active_unavailable" | "active_available";

type M3RuntimeState = {
  programId: string;
  runtimeKey: "recruiting_m3";
  isActive: boolean;
  eligibility: {
    status: "eligible" | "ineligible" | "unknown";
    reasonCodes: string[];
    computedAt: string | null;
  };
  mode: M3RuntimeMode;
};

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toISOString();
}

function badgeClass(mode: M3RuntimeMode) {
  switch (mode) {
    case "inactive":
      return "border border-zinc-700/60 bg-zinc-950 text-zinc-200";
    case "active_unavailable":
      return "border border-amber-600/50 bg-amber-950/30 text-amber-200";
    case "active_available":
      return "border border-emerald-600/50 bg-emerald-950/30 text-emerald-200";
  }
}

export function M3RuntimePanel(props: {
  title: string;
  stateUrl: string; // e.g. /api/recruiting/m3/state or /api/program-health/m3/state
  teamId?: string | null;
  programId?: string | null;
}) {
  const { title, stateUrl } = props;

  const [teamId, setTeamId] = React.useState(props.teamId ?? "");
  const [programId, setProgramId] = React.useState(props.programId ?? "");
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [state, setState] = React.useState<M3RuntimeState | null>(null);

  const fetchState = React.useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const u = new URL(stateUrl, window.location.origin);
      if (programId) u.searchParams.set("programId", programId);
      if (teamId) u.searchParams.set("teamId", teamId);

      const res = await fetch(u.toString(), { method: "GET" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error ?? `Request failed: ${res.status}`);
      }
      setState(json as M3RuntimeState);
    } catch (e: any) {
      setState(null);
      setErr(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [stateUrl, programId, teamId]);

  React.useEffect(() => {
    void fetchState();
  }, [fetchState]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-zinc-100">{title}</div>
          <div className="text-xs text-zinc-400">
            Server-authoritative runtime posture (guarded). No client-side activation.
          </div>
        </div>

        {state ? (
          <div className={`px-2 py-1 text-xs rounded-md ${badgeClass(state.mode)}`}>
            {state.mode}
          </div>
        ) : (
          <div className={`px-2 py-1 text-xs rounded-md ${badgeClass("inactive")}`}>
            no state
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block">
          <div className="mb-1 text-xs text-zinc-400">programId</div>
          <input
            value={programId}
            onChange={(e) => setProgramId(e.target.value)}
            placeholder="uuid"
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
          />
        </label>

        <label className="block">
          <div className="mb-1 text-xs text-zinc-400">
            teamId (optional; resolves to programId)
          </div>
          <input
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            placeholder="uuid"
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
          />
        </label>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => void fetchState()}
          className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 hover:border-zinc-600"
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>

        {err ? <div className="text-sm text-rose-300">{err}</div> : null}
      </div>

      <div className="mt-4 rounded-lg border border-zinc-900 bg-black/20 p-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <div className="text-xs text-zinc-400">
            <div>
              <span className="text-zinc-500">programId:</span>{" "}
              <span className="text-zinc-200">{state?.programId ?? "—"}</span>
            </div>
            <div>
              <span className="text-zinc-500">isActive:</span>{" "}
              <span className="text-zinc-200">{String(state?.isActive ?? false)}</span>
            </div>
            <div>
              <span className="text-zinc-500">eligibility:</span>{" "}
              <span className="text-zinc-200">{state?.eligibility?.status ?? "—"}</span>
            </div>
          </div>

          <div className="text-xs text-zinc-400">
            <div>
              <span className="text-zinc-500">computedAt:</span>{" "}
              <span className="text-zinc-200">
                {fmtDate(state?.eligibility?.computedAt)}
              </span>
            </div>
            <div>
              <span className="text-zinc-500">reasonCodes:</span>{" "}
              <span className="text-zinc-200">
                {(state?.eligibility?.reasonCodes ?? []).length
                  ? (state?.eligibility?.reasonCodes ?? []).join(", ")
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 text-xs text-zinc-500">
          Interpretation contract:
          <ul className="mt-1 list-disc pl-5">
            <li>
              <span className="text-zinc-300">inactive</span>: R-M3-0011 not applied
              (no M3 impacts).
            </li>
            <li>
              <span className="text-zinc-300">active_unavailable</span>: activated, but
              program not eligible.
            </li>
            <li>
              <span className="text-zinc-300">active_available</span>: activated and
              eligible; impacts may exist.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
