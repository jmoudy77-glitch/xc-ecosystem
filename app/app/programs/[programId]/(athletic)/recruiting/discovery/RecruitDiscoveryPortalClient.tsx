"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type OriginKey = "surfaced" | "favorites";

type Candidate = {
  id: string;
  displayName: string;
  eventGroup?: string | null;
  gradYear?: number | null;
  originKey: OriginKey;
  originMeta: Record<string, unknown>;
};

type Props = {
  programId: string;
};

function coerceString(v: unknown): string | null {
  if (typeof v === "string" && v.trim().length > 0) return v;
  return null;
}

function coerceNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function asCandidateList(input: unknown, originKey: OriginKey): Candidate[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((row: any) => {
      const id =
        coerceString(row?.id) ??
        coerceString(row?.athlete_id) ??
        coerceString(row?.athleteId) ??
        coerceString(row?.recruit_id) ??
        coerceString(row?.recruitId);

      const displayName =
        coerceString(row?.displayName) ??
        coerceString(row?.display_name) ??
        coerceString(row?.name) ??
        [coerceString(row?.first_name), coerceString(row?.last_name)]
          .filter(Boolean)
          .join(" ")
          .trim();

      if (!id || !displayName) return null;

      const eventGroup =
        coerceString(row?.event_group) ??
        coerceString(row?.eventGroup) ??
        null;

      const gradYear = coerceNumber(row?.grad_year) ?? coerceNumber(row?.gradYear);

      return {
        id,
        displayName,
        eventGroup,
        gradYear,
        originKey,
        originMeta: {},
      } satisfies Candidate;
    })
    .filter(Boolean) as Candidate[];
}

export default function RecruitDiscoveryPortalClient({ programId }: Props) {
  // NOTE: This scaffold intentionally does not assume any specific upstream data
  // shape yet. Surfaced candidates will be wired to the canonical sourcing logic
  // in the next promotion once the read surface is finalized.
  const surfaced = useMemo<Candidate[]>(() => {
    // Placeholder: empty until sourced list is wired.
    return [];
  }, []);

  const [favorites, setFavorites] = useState<Candidate[]>([]);

  const addFavorite = (c: Candidate) => {
    setFavorites((prev) => {
      if (prev.some((p) => p.id === c.id)) return prev;
      return [
        ...prev,
        {
          ...c,
          originKey: "favorites",
          originMeta: { ...(c.originMeta ?? {}), favoritedAt: new Date().toISOString() },
        },
      ];
    });
  };

  const removeFavorite = (candidateId: string) => {
    setFavorites((prev) => prev.filter((c) => c.id !== candidateId));
  };

  const isFav = (candidateId: string) => favorites.some((c) => c.id === candidateId);

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">Recruiting</div>
          <h1 className="truncate text-xl font-semibold">Recruit Discovery Portal</h1>
          <div className="text-sm text-muted-foreground">
            Program: <span className="font-mono">{programId}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
            href={`/app/programs/${programId}/recruiting`}
          >
            Back to Stabilization
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <section className="rounded-lg border bg-card">
          <div className="border-b p-3">
            <div className="text-sm font-medium">Surfaced</div>
            <div className="text-xs text-muted-foreground">
              System-sourced candidates (wiring next promotion).
            </div>
          </div>

          <div className="p-3">
            {surfaced.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No surfaced candidates yet. Next promotion wires sourcing + filters.
              </div>
            ) : (
              <ul className="space-y-2">
                {surfaced.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{c.displayName}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.eventGroup ?? "—"} · {c.gradYear ?? "—"}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                      onClick={() => addFavorite(c)}
                      disabled={isFav(c.id)}
                      title={isFav(c.id) ? "Already in Favorites" : "Add to Favorites"}
                    >
                      {isFav(c.id) ? "Favorited" : "Favorite"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded-lg border bg-card">
          <div className="border-b p-3">
            <div className="text-sm font-medium">Favorites</div>
            <div className="text-xs text-muted-foreground">
              Coach-curated shortlist (session-state v1).
            </div>
          </div>

          <div className="p-3">
            {favorites.length === 0 ? (
              <div className="text-sm text-muted-foreground">No favorites yet.</div>
            ) : (
              <ul className="space-y-2">
                {favorites.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{c.displayName}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.eventGroup ?? "—"} · {c.gradYear ?? "—"}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                      onClick={() => removeFavorite(c.id)}
                      title="Remove from Favorites"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
