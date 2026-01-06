// app/programs/[programId]/(athletic)/recruiting/RecruitingSurfacedPanel.tsx

import * as React from "react";

export function RecruitingSurfacedPanel({ children }: { children?: React.ReactNode }) {
  return (
    <section className="flex h-full min-h-0 flex-col rounded-lg border bg-card">
      <div className="border-b px-3 py-2">
        <div className="text-sm font-medium">Surfaced</div>
        <div className="text-xs text-muted-foreground">Engine-curated candidates (read-only)</div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">{children}</div>
    </section>
  );
}
