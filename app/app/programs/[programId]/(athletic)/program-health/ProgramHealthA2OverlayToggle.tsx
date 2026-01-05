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

  const toggle = () => {
    const next = new URLSearchParams(sp.toString());
    if (isA2) next.delete("phOverlay");
    else next.set("phOverlay", "a2");
    const qs = next.toString();
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
      <button
        type="button"
        onClick={toggle}
        className="rounded-md border border-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-900/40"
        aria-pressed={isA2}
        title="Switch overlays (A1/A2)"
      >
        {isA2 ? "A2" : "A1"}
      </button>

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
