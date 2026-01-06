// app/programs/[programId]/(athletic)/recruiting/RecruitingFavoritesPanelClient.tsx

"use client";

import * as React from "react";
import {
  RecruitingCandidateChip,
  type RecruitingPanelCandidate,
} from "./RecruitingCandidateChip";
import {
  loadFavoritesForProgram,
  saveFavoritesForProgram,
  type StabilizationFavorite,
} from "./_helpers/stabilizationFavorites";

export function RecruitingFavoritesPanelClient({ programId }: { programId: string }) {
  const [rows, setRows] = React.useState<StabilizationFavorite[]>([]);

  const refresh = React.useCallback(() => {
    setRows(loadFavoritesForProgram(programId));
  }, [programId]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  React.useEffect(() => {
    const handler = (e: any) => {
      if (e?.detail?.programId && e.detail.programId !== programId) return;
      refresh();
    };
    window.addEventListener("xc:recruiting:favorites:changed" as any, handler);
    return () => window.removeEventListener("xc:recruiting:favorites:changed" as any, handler);
  }, [programId, refresh]);

  const remove = (athleteId: string) => {
    const next = rows.filter((c) => c.athleteId !== athleteId);
    saveFavoritesForProgram(programId, next);
    setRows(next);
    window.dispatchEvent(
      new CustomEvent("xc:recruiting:favorites:changed", { detail: { programId } })
    );
  };

  if (rows.length === 0) {
    return <div className="text-sm text-muted-foreground">No favorites yet.</div>;
  }

  return (
    <div className="space-y-2">
      {rows.map((c) => (
        <RecruitingCandidateChip
          key={c.athleteId}
          programId={programId}
          candidate={
            {
              athleteId: c.athleteId,
              displayName: c.displayName,
              eventGroup: c.eventGroup,
              gradYear: c.gradYear,
              originKey: "favorites",
              originMeta: c.originMeta ?? {},
            } as RecruitingPanelCandidate
          }
          onRemoveFavorite={() => remove(c.athleteId)}
        />
      ))}
    </div>
  );
}
