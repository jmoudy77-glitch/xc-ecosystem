// app/programs/[programId]/brainstorm/BrainstormPageClient.tsx

"use client";

import React, { useMemo, useState } from "react";
import BrainstormModal, { BrainstormContext } from "./BrainstormModal";

export default function BrainstormPageClient({ programId }: { programId: string }) {
  // This page is a lightweight host so we can iterate quickly on the Brainstorm modal.
  // In the final system, the modal will likely be invoked contextually (Program Health,
  // Recruiting, Performance, etc.) and will hydrate its context from the caller.
  const [open, setOpen] = useState(true);

  const context: BrainstormContext = useMemo(
    () => ({
      programId,
      scopeType: "program",
      scopeId: programId,
      title: "Program Brainstorm",
    }),
    [programId]
  );

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-[var(--foreground)]">Brainstorm (WIP)</div>
          <div className="text-xs text-[var(--muted-foreground)]">
            This route exists so we can iterate on the BrainstormModal UI and interaction model.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md bg-panel-muted/35 px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl hover:bg-panel-muted/45 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/35"
        >
          Open Brainstorm
        </button>
      </div>

      <BrainstormModal open={open} onClose={() => setOpen(false)} context={context} />
    </div>
  );
}
