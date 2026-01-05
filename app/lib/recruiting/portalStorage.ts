// app/lib/recruiting/portalStorage.ts

export type RecruitDiscoveryOriginKey = "surfaced" | "favorites";

export type RecruitDiscoveryStoredCandidate = {
  id: string;
  displayName: string;
  eventGroup: string | null;
  gradYear: number | null;
};

export type RecruitDiscoveryOriginRegistryEntry = {
  candidate: RecruitDiscoveryStoredCandidate;
  originKey: RecruitDiscoveryOriginKey;
  originMeta: Record<string, unknown>;
};

const FAVORITES_STORAGE_VERSION = 1;
const HIDDEN_SURFACED_VERSION = 1;
const ORIGIN_REGISTRY_VERSION = 1;

export function favoritesStorageKey(programId: string) {
  return `xcsys:recruiting:discovery:favorites:v${FAVORITES_STORAGE_VERSION}:${programId}`;
}

export function favoritesOrderStorageKey(programId: string) {
  return `xcsys:recruiting:discovery:favoritesOrder:v${FAVORITES_STORAGE_VERSION}:${programId}`;
}

export function readFavoritesOrder(programId: string): string[] {
  if (typeof window === "undefined") return [];
  const parsed = safeJsonParse<string[]>(
    window.localStorage.getItem(favoritesOrderStorageKey(programId))
  );
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((x) => typeof x === "string" && x.trim())
    .map((x) => x.trim());
}

export function writeFavoritesOrder(programId: string, ids: string[]) {
  if (typeof window === "undefined") return;
  const uniq: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    const id = raw?.trim();
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    uniq.push(id);
  }
  window.localStorage.setItem(favoritesOrderStorageKey(programId), JSON.stringify(uniq));
}

export function clearFavoritesOrder(programId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(favoritesOrderStorageKey(programId));
}

export function hiddenSurfacedStorageKey(programId: string) {
  return `xcsys:recruiting:discovery:hiddenSurfaced:v${HIDDEN_SURFACED_VERSION}:${programId}`;
}

export function originRegistryStorageKey(programId: string, candidateId: string) {
  return `xcsys:recruiting:discovery:origin:v${ORIGIN_REGISTRY_VERSION}:${programId}:${candidateId}`;
}

export function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function readFavorites(programId: string): any[] {
  if (typeof window === "undefined") return [];
  const parsed = safeJsonParse<any[]>(window.localStorage.getItem(favoritesStorageKey(programId)));
  return Array.isArray(parsed) ? parsed : [];
}

export function writeFavorites(programId: string, favorites: any[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(favoritesStorageKey(programId), JSON.stringify(favorites));
}

export function removeFromFavorites(programId: string, candidateId: string) {
  if (typeof window === "undefined") return;
  const current = readFavorites(programId);
  const next = current.filter((c: any) => c?.id !== candidateId);
  writeFavorites(programId, next);
}

export function addToFavoritesIfMissing(programId: string, candidate: RecruitDiscoveryStoredCandidate) {
  if (typeof window === "undefined") return;
  const current = readFavorites(programId);
  if (current.some((c: any) => c?.id === candidate.id)) return;

  const next = [
    ...current,
    {
      id: candidate.id,
      displayName: candidate.displayName,
      eventGroup: candidate.eventGroup,
      gradYear: candidate.gradYear,
      originKey: "favorites",
      originMeta: { favoritedAt: new Date().toISOString() },
    },
  ];

  writeFavorites(programId, next);
}

export function readHiddenSurfacedIds(programId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  const parsed = safeJsonParse<string[]>(window.localStorage.getItem(hiddenSurfacedStorageKey(programId)));
  if (!Array.isArray(parsed)) return new Set();
  return new Set(parsed.filter((x) => typeof x === "string" && x.length > 0));
}

export function writeHiddenSurfacedIds(programId: string, ids: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(hiddenSurfacedStorageKey(programId), JSON.stringify(Array.from(ids)));
}

export function hideSurfacedCandidate(programId: string, candidateId: string) {
  if (typeof window === "undefined") return;
  const ids = readHiddenSurfacedIds(programId);
  ids.add(candidateId);
  writeHiddenSurfacedIds(programId, ids);
}

export function unhideSurfacedCandidate(programId: string, candidateId: string) {
  if (typeof window === "undefined") return;
  const ids = readHiddenSurfacedIds(programId);
  ids.delete(candidateId);
  writeHiddenSurfacedIds(programId, ids);
}

export function clearHiddenSurfaced(programId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(hiddenSurfacedStorageKey(programId));
}

export function writeOriginRegistryEntry(
  programId: string,
  entry: RecruitDiscoveryOriginRegistryEntry
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    originRegistryStorageKey(programId, entry.candidate.id),
    JSON.stringify(entry)
  );
}

export function readOriginRegistryEntry(
  programId: string,
  candidateId: string
): RecruitDiscoveryOriginRegistryEntry | null {
  if (typeof window === "undefined") return null;
  const parsed = safeJsonParse<RecruitDiscoveryOriginRegistryEntry>(
    window.localStorage.getItem(originRegistryStorageKey(programId, candidateId))
  );
  if (!parsed || typeof parsed !== "object") return null;
  if (!parsed.candidate || typeof parsed.candidate !== "object") return null;
  return parsed;
}

export function clearOriginRegistryEntry(programId: string, candidateId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(originRegistryStorageKey(programId, candidateId));
}
