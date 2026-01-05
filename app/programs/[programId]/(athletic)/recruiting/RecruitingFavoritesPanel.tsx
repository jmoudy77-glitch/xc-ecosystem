// app/programs/[programId]/(athletic)/recruiting/RecruitingFavoritesPanel.tsx

import * as React from "react";

export function RecruitingFavoritesPanel({ children }: { children?: React.ReactNode }) {
  return (
    <section className="flex h-full min-h-0 flex-col rounded-lg border bg-card">
      <div className="border-b px-3 py-2">
        <div className="text-sm font-medium">Favorites</div>
        <div className="text-xs text-muted-foreground">Coach-curated shortlist</div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {children ?? (
          <div className="rounded-md border bg-muted/20 px-3 py-3">
            <div className="text-sm font-medium">Not wired yet</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Discovery will feed this panel. Drag from here into the board once wired.
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
