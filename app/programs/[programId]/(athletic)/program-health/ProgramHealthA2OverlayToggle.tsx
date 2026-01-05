"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  programId: string;
};

// A1/A2 overlay toggle contract:
// - OFF => A1 overlays (default)
// - ON  => A2 overlays via query param phOverlay=a2

export function ProgramHealthA2OverlayToggle({ programId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const isA2 = sp.get("phOverlay") === "a2";
  const horizon = sp.get("horizon");

  const [loading, setLoading] = React.useState(false);
  const [hasA2Data, setHasA2Data] = React.useState<boolean | null>(null);

  const setOverlay = (next: "a1" | "a2") => {
    const nextParams = new URLSearchParams(sp.toString());
    if (next === "a2") nextParams.set("phOverlay", "a2");
    else nextParams.delete("phOverlay");
    const qs = nextParams.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!isA2) {
        setHasA2Data(null);
        return;
      }

      setLoading(true);
      try {
        const url = new URL("/app/api/program-health/a2", window.location.origin);
        url.searchParams.set("programId", programId);
        if (horizon) url.searchParams.set("horizon", horizon);

        const res = await fetch(url.toString(), { method: "GET" });
        const json = await res.json();
        if (cancelled) return;

        setHasA2Data(!!json?.data);
      } catch {
        if (!cancelled) setHasA2Data(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [isA2, programId, horizon]);

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-xs text-muted-foreground">Overlays</div>
      <div className="inline-flex h-8 overflow-hidden rounded-md border border-white/10 bg-white/5">
        <button
          type="button"
          aria-label="Show A1 overlays"
          className={[
            "px-3 text-xs",
            !isA2 ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/10",
          ].join(" ")}
          onClick={() => setOverlay("a1")}
          title="A1 overlays"
        >
          A1
        </button>
        <div className="w-px bg-white/10" />
        <button
          type="button"
          aria-label="Show A2 overlays"
          className={[
            "px-3 text-xs",
            isA2 ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/10",
          ].join(" ")}
          onClick={() => setOverlay("a2")}
          title="A2 overlays"
        >
          A2
        </button>
      </div>

      {isA2 ? (
        <div className="rounded-md border border-slate-800 bg-slate-950/40 px-2 py-1 text-[11px] text-slate-200">
          {loading
            ? "Loading A2…"
            : hasA2Data === true
              ? "A2 overlay active (read-only)"
              : "A2 overlay unavailable"}
        </div>
      ) : null}
    </div>
  );
}
