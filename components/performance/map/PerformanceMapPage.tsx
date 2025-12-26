"use client";
import ExecutionBalanceMapPanel from "./ExecutionBalanceMapPanel";
import AthleteTrajectoryStrip from "./AthleteTrajectoryStrip";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type BalanceRollup = {
  tension: number; // [-1..+1]
};

const DICHOTOMY_KEYS = [
  "training_load_vs_readiness",
  "individual_vs_team",
  "consistency_vs_adaptation",
  "discipline_vs_instinct",
  "sustainability_vs_pressure",
] as const;

function safeParseJson(value: unknown): unknown | null {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function extractPairsJson(json: unknown): Record<string, unknown> | null {
  if (!json || typeof json !== "object") return null;
  const obj = json as Record<string, unknown>;

  // common shapes
  const direct = (obj.pairs_json ?? obj.pairsJson ?? obj.pairs) as unknown;
  if (direct) {
    const parsed = typeof direct === "string" ? safeParseJson(direct) : direct;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  }

  const snapshot = (obj.snapshot ?? (obj.data && (obj.data as Record<string, unknown>).snapshot)) as unknown;
  if (snapshot && typeof snapshot === "object") {
    const snapObj = snapshot as Record<string, unknown>;
    const pj = snapObj.pairs_json as unknown;
    if (pj) {
      const parsed = typeof pj === "string" ? safeParseJson(pj) : pj;
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    }
  }

  const snaps = obj.snapshots;
  const first = Array.isArray(snaps) ? snaps[0] : null;
  if (first && typeof first === "object") {
    const firstObj = first as Record<string, unknown>;
    const pj = firstObj.pairs_json as unknown;
    if (pj) {
      const parsed = typeof pj === "string" ? safeParseJson(pj) : pj;
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    }
  }

  return null;
}

function extractRollupsFromApi(json: unknown): BalanceRollup[] | null {
  const pairs = extractPairsJson(json);
  if (!pairs || typeof pairs !== "object") return null;

  const rollups: BalanceRollup[] = [];
  for (const key of DICHOTOMY_KEYS) {
    const entry = pairs[key] as unknown;

    let raw: number | null = null;
    if (typeof entry === "number") raw = entry;
    if (!raw && entry && typeof entry === "object") {
      const e = entry as Record<string, unknown>;
      if (typeof e.tension === "number") raw = e.tension;
      else if (typeof e.x === "number") raw = e.x;
      else if (typeof e.distributionX === "number") raw = e.distributionX;
    }

    if (typeof raw !== "number" || Number.isNaN(raw)) return null;
    rollups.push({ tension: clamp(raw, -1, 1) });
  }

  return rollups.length === DICHOTOMY_KEYS.length ? rollups : null;
}

export default function PerformanceMapPage() {
  const params = useParams<{ programId?: string }>();

  const programId = useMemo(() => {
    const raw = params?.programId;
    return typeof raw === "string" && raw.length > 0 ? raw : null;
  }, [params]);

  const [balanceRollups, setBalanceRollups] = useState<BalanceRollup[] | null>(null);

  const [panelBorderClass, setPanelBorderClass] = useState<string>("");

  const handlePanelStateChange = useCallback(
    (next: { panelState?: string; borderClass?: string } | null) => {
      setPanelBorderClass(next?.borderClass ?? "");
    },
    []
  );

  useEffect(() => {
    if (!programId) return;

    const controller = new AbortController();

    const url = `/api/performance/rollups/teams?programId=${encodeURIComponent(
      programId
    )}&mode=balance&lens_code=season`;

    (async () => {
      try {
        const res = await fetch(url, {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
          },
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          console.debug("[performance/map] rollups/teams balance", {
            ok: res.ok,
            status: res.status,
            url,
            json,
          });
          return;
        }

        const rollups = extractRollupsFromApi(json);
        if (!rollups) {
          console.debug("[performance/map] rollups/teams balance unrecognized", {
            url,
            json,
          });
          return;
        }

        setBalanceRollups(rollups);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        console.debug("[performance/map] rollups/teams balance failed", {
          url,
          error: String(e),
        });
      }
    })();

    return () => controller.abort();
  }, [programId]);

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Performance</h1>
        <p className="text-sm text-muted-foreground">
          Map → Brief → Brainstorm → Decide → Execute
        </p>
      </header>

      <section className={`rounded-2xl border bg-card p-4 ${panelBorderClass}`}>
        <ExecutionBalanceMapPanel
          rollups={balanceRollups}
          onPanelStateChange={handlePanelStateChange}
        />
      </section>

      <section className="rounded-2xl border bg-card p-4">
        <AthleteTrajectoryStrip />
      </section>
    </div>
  );
}