// app/programs/[programId]/(athletic)/recruiting/_helpers/stabilizationFavorites.ts

"use client";

import { favoritesStorageKey, safeJsonParse } from "@/app/lib/recruiting/portalStorage";

export type StabilizationFavorite = {
  athleteId: string;
  displayName: string;
  eventGroup: string | null;
  gradYear: number | null;
  originKey: "favorites";
  originMeta: Record<string, unknown>;
};

export function loadFavoritesForProgram(programId: string): StabilizationFavorite[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(favoritesStorageKey(programId));
  const parsed = safeJsonParse<any>(raw);

  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((c: any) => {
      const athleteId = String(c?.id ?? c?.athleteId ?? c?.athlete_id ?? "").trim();
      const displayName = String(c?.displayName ?? c?.display_name ?? c?.name ?? "").trim();
      if (!athleteId || !displayName) return null;
      return {
        athleteId,
        displayName,
        eventGroup: (c?.eventGroup ?? c?.event_group ?? null) as any,
        gradYear:
          (typeof c?.gradYear === "number" ? c.gradYear :
          typeof c?.grad_year === "number" ? c.grad_year : null) as any,
        originKey: "favorites",
        originMeta: (c?.originMeta && typeof c.originMeta === "object" ? c.originMeta : {}) as any,
      } as StabilizationFavorite;
    })
    .filter(Boolean) as StabilizationFavorite[];
}

export function saveFavoritesForProgram(programId: string, favorites: StabilizationFavorite[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(favoritesStorageKey(programId), JSON.stringify(favorites));
}
