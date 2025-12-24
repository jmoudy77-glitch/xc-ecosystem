// components/performance/map/PerformanceMapPage.tsx
"use client";
import ProgramBalanceMapPanel from "./ProgramBalanceMapPanel";
import AthleteTrajectoryStrip from "./AthleteTrajectoryStrip";
import { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";

export default function PerformanceMapPage() {
  const params = useParams<{ programId?: string }>();

  const programId = useMemo(() => {
    const raw = params?.programId;
    return typeof raw === "string" && raw.length > 0 ? raw : null;
  }, [params]);

  useEffect(() => {
    if (!programId) return;

    const controller = new AbortController();

    // NOTE: This is intentionally "side-effect only" for now.
    // We just want to confirm the request is firing in Network and returning expected JSON.
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

        // Keep this as a debug log only (no UI change yet)
        console.debug("[performance/map] rollups/teams balance", {
          ok: res.ok,
          status: res.status,
          url,
          json,
        });
      } catch (e) {
        if ((e as any)?.name === "AbortError") return;
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

      <section className="rounded-2xl border bg-card p-4">
        <ProgramBalanceMapPanel />
      </section>

      <section className="rounded-2xl border bg-card p-4">
        <AthleteTrajectoryStrip />
      </section>
    </div>
  );
}