// app/debug/scoring/page.tsx
"use client";

import { useState } from "react";

type RecomputeResult = {
  ok: boolean;
  updated?: number;
  error?: string;
};

export default function DebugScoringPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<RecomputeResult | null>(null);

  async function runRecompute() {
    setIsRunning(true);
    setResult(null);

    try {
      const res = await fetch("/api/scoring/recompute", {
        method: "POST",
      });

      const json = (await res.json()) as RecomputeResult;

      setResult(json);
    } catch (err) {
      console.error("Failed to call /api/scoring/recompute:", err);
      setResult({
        ok: false,
        error: "Network or server error calling /api/scoring/recompute",
      });
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <h1 className="text-lg font-semibold text-slate-900">
          Scoring Debug: Recompute Athlete Scores
        </h1>

        <p className="text-sm text-slate-600">
          This debug page triggers the scoring engine to recompute{" "}
          <span className="font-mono">athlete_scores</span> for all athletes
          using the current deterministic scoring logic.
        </p>

        <button
          type="button"
          onClick={runRecompute}
          disabled={isRunning}
          className="w-full rounded-md bg-blue-600 text-white text-sm font-medium px-4 py-2 disabled:opacity-60"
        >
          {isRunning ? "Recomputing scores..." : "Recompute global athlete scores"}
        </button>

        {result && (
          <div
            className={`rounded-md border px-3 py-2 text-xs ${
              result.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-200 bg-red-50 text-red-900"
            }`}
          >
            {result.ok ? (
              <p>
                ✅ Recompute complete. Updated rows in{" "}
                <span className="font-mono">athlete_scores</span>:{" "}
                <span className="font-semibold">
                  {typeof result.updated === "number" ? result.updated : 0}
                </span>
              </p>
            ) : (
              <p>
                ❌ Failed to recompute scores:{" "}
                <span className="font-mono">{result.error ?? "Unknown error"}</span>
              </p>
            )}
          </div>
        )}

        <p className="text-[11px] text-slate-500">
          This page is meant for development and internal testing so you can
          validate the scoring pipeline without wiring it into production UI yet.
        </p>
      </div>
    </div>
  );
}
