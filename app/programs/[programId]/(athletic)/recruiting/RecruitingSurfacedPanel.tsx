// app/programs/[programId]/(athletic)/recruiting/RecruitingSurfacedPanel.tsx

import * as React from "react";

export function RecruitingSurfacedPanel({ children }: { children?: React.ReactNode }) {
  return (
    <section className="flex h-full min-h-0 flex-col rounded-2xl ring-1 ring-panel panel-muted shadow-elev-2">
      <div className="relative overflow-hidden border-b border-subtle px-3 py-3">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-14 opacity-100"
        >
          <div className="absolute inset-0 bg-[radial-gradient(1200px_120px_at_0%_0%,color-mix(in_oklab,white_10%,transparent)_0%,transparent_65%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent,transparent,transparent)]" />
        </div>
        <div className="text-sm font-semibold truncate">Surfaced</div>
        <div className="text-[11px] text-muted">Engine-curated candidates (read-only)</div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3 glass-scrollbar">{children}</div>
    </section>
  );
}
