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

type M3Impact = {
  id: string;
  program_id: string;
  recruit_id: string;
  capability_node_id: string;
  horizon: string;
  impact_score: number;
  cohort_tier: number;
  rationale: string;
  inputs_hash: string;
  created_at: string;
};

type ImpactsResponse = {
  state: M3RuntimeState;
  impacts: M3Impact[];
};

function fmtDateShort(s: string) {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toISOString();
}

export function M3ImpactsPanel(props: {
  title: string;
  impactsUrl: string; // e.g. /api/recruiting/m3/impacts or /api/program-health/m3/impacts
  teamId?: string | null;
  programId?: string | null;
  defaultHorizon?: string | null;
}) {
  const { title, impactsUrl } = props;

  const [teamId, setTeamId] = React.useState(props.teamId ?? "");
  const [programId, setProgramId] = React.useState(props.programId ?? "");
  const [horizon, setHorizon] = React.useState(props.defaultHorizon ?? "");
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [data, setData] = React.useState<ImpactsResponse | null>(null);

  const fetchImpacts = React.useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const u = new URL(impactsUrl, window.location.origin);
      if (programId) u.searchParams.set("programId", programId);
      if (teamId) u.searchParams.set("teamId", teamId);
      if (horizon) u.searchParams.set("horizon", horizon);

      const res = await fetch(u.toString(), { method: "GET" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error ?? `Request failed: ${res.status}`);
      }
      setData(json as ImpactsResponse);
    } catch (e: any) {
      setData(null);
      setErr(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [impactsUrl, programId, teamId, horizon]);

  React.useEffect(() => {
    void fetchImpacts();
  }, [fetchImpacts]);

  const mode = data?.state?.mode ?? "inactive";
  const impacts = data?.impacts ?? [];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-zinc-100">{title}</div>
          <div className="text-xs text-zinc-400">
            Read-only impacts feed. Returns empty until mode=active_available.
          </div>
        </div>
        <div className="px-2 py-1 text-xs rounded-md border border-zinc-700/60 bg-zinc-950 text-zinc-200">
          {mode}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
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
          <div className="mb-1 text-xs text-zinc-400">teamId (optional)</div>
          <input
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            placeholder="uuid"
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
          />
        </label>

        <label className="block">
          <div className="mb-1 text-xs text-zinc-400">horizon (optional)</div>
          <input
            value={horizon}
            onChange={(e) => setHorizon(e.target.value)}
            placeholder="H0 / H1 / H2 / H3"
            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
          />
        </label>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => void fetchImpacts()}
          className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 hover:border-zinc-600"
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>

        {err ? <div className="text-sm text-rose-300">{err}</div> : null}
      </div>

      <div className="mt-4">
        {mode !== "active_available" ? (
          <div className="rounded-lg border border-zinc-900 bg-black/20 p-3 text-sm text-zinc-300">
            No impacts available. This is expected unless Recruiting M3 is activated and the
            program is eligible.
          </div>
        ) : impacts.length === 0 ? (
          <div className="rounded-lg border border-zinc-900 bg-black/20 p-3 text-sm text-zinc-300">
            Active and eligible, but no impact rows found.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-900">
            <div className="grid grid-cols-12 bg-black/30 px-3 py-2 text-xs text-zinc-400">
              <div className="col-span-2">Horizon</div>
              <div className="col-span-2">Tier</div>
              <div className="col-span-2">Score</div>
              <div className="col-span-6">Rationale</div>
            </div>

            {impacts.slice(0, 200).map((x) => (
              <div
                key={x.id}
                className="grid grid-cols-12 gap-2 border-t border-zinc-900 px-3 py-2 text-xs text-zinc-200"
              >
                <div className="col-span-2">{x.horizon}</div>
                <div className="col-span-2">{x.cohort_tier}</div>
                <div className="col-span-2">{String(x.impact_score)}</div>
                <div className="col-span-6 text-zinc-300">{x.rationale}</div>

                <div className="col-span-12 mt-1 text-[11px] text-zinc-500">
                  recruit_id: {x.recruit_id} · capability_node_id: {x.capability_node_id} ·
                  created_at: {fmtDateShort(x.created_at)} · inputs_hash: {x.inputs_hash}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
