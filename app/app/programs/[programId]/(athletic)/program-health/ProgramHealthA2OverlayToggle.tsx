"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  programId: string;
};

export function ProgramHealthA2OverlayToggle({ programId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const a2 = sp.get("a2") === "1";
  const horizon = sp.get("horizon");

  const [loading, setLoading] = React.useState(false);
  const [hasA2Data, setHasA2Data] = React.useState<boolean | null>(null);

  const toggle = () => {
    const next = new URLSearchParams(sp.toString());
    if (a2) next.delete("a2");
    else next.set("a2", "1");
    router.replace(`${pathname}?${next.toString()}`);
  };

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!a2) {
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
  }, [a2, programId, horizon]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        className="rounded-md border border-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-900/40"
        aria-pressed={a2}
      >
        {a2 ? "A2 Sandbox: ON" : "A2 Sandbox: OFF"}
      </button>

      {a2 ? (
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
