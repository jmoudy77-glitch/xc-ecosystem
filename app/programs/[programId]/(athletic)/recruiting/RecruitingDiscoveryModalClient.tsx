"use client";

import * as React from "react";
import RecruitDiscoveryPortalClient from "./RecruitDiscoveryPortalClient";

type Props = {
  programId: string;
};

export default function RecruitingDiscoveryModalClient({ programId }: Props) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
        onClick={() => setOpen(true)}
      >
        Discovery Portal
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Recruiting Discovery Portal"
        >
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />

          <div className="relative mx-4 w-full max-w-6xl overflow-hidden rounded-xl border border-white/10 bg-black/80 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="min-w-0">
                <div className="text-xs text-white/50">Recruiting</div>
                <div className="truncate text-sm font-semibold text-white/90">Discovery Portal</div>
              </div>

              <button
                type="button"
                className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="max-h-[80vh] overflow-auto p-4">
              <RecruitDiscoveryPortalClient programId={programId} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
