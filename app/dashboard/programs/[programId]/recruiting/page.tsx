"use client";

// app/(dashboard)/programs/[programId]/recruiting/page.tsx
// Simple Recruiting Board view backed by program_athletes.
// Lists athletes attached to this program as recruits (relationship_type = 'recruit').

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type RelationshipType =
  | "recruit"
  | "watchlist"
  | "walk_on"
  | "roster"
  | "alumni"
  | "owned";

type ProgramAthlete = {
  id: string;
  program_id: string;
  athlete_id: string;
  level: string | null;
  relationship_type: RelationshipType;
  status: string | null;
  source: string | null;
  created_by_program_member_id: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

type ApiResponse =
  | {
      programId: string;
      athletes: ProgramAthlete[];
      error?: undefined;
    }
  | {
      error: string;
      programId?: undefined;
      athletes?: undefined;
    };

export default function RecruitingBoardPage() {
  const params = useParams<{ programId: string }>();
  const programId = params?.programId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [athletes, setAthletes] = useState<ProgramAthlete[]>([]);

  useEffect(() => {
    if (!programId) return;

    let cancelled = false;

    async function loadRecruits() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/programs/${programId}/athletes?relationshipType=recruit`,
        );

        const data: ApiResponse = await res.json();

        if (!res.ok) {
          const message =
            "error" in data && data.error
              ? data.error
              : "Failed to load recruits";
          if (!cancelled) {
            setError(message);
          }
          return;
        }

        if (!cancelled) {
          setAthletes(data.athletes ?? []);
        }
      } catch (err: any) {
        console.error("[RecruitingBoardPage] loadRecruits error:", err);
        if (!cancelled) {
          setError("Unexpected error loading recruits");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRecruits();

    return () => {
      cancelled = true;
    };
  }, [programId]);

  const hasRecruits = athletes.length > 0;

  return (
    <div className="flex flex-col gap-4 px-4 py-6 md:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Recruiting Board
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Athletes who have been officially attached to this program as recruits.
        </p>
      </div>

      {loading && (
        <div className="rounded-md border border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground">
          Loading recruits…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && !hasRecruits && (
        <div className="rounded-md border border-border bg-background/60 px-4 py-6 text-sm text-muted-foreground">
          <p className="font-medium">No recruits yet.</p>
          <p className="mt-1">
            When you convert an athlete inquiry or manually attach an athlete as
            a recruit, they&apos;ll appear here.
          </p>
        </div>
      )}

      {!loading && !error && hasRecruits && (
        <div className="overflow-x-auto rounded-md border border-border bg-background/60">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2">Athlete ID</th>
                <th className="px-3 py-2">Level</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {athletes.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-border/40 last:border-0 hover:bg-muted/30"
                >
                  <td className="px-3 py-2 font-mono text-xs md:text-sm">
                    {a.athlete_id}
                  </td>
                  <td className="px-3 py-2 text-xs md:text-sm">
                    {a.level ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs md:text-sm">
                    {a.status ?? "prospect"}
                  </td>
                  <td className="px-3 py-2 text-xs md:text-sm">
                    {a.source ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs md:text-sm">
                    {new Date(a.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
