// lib/athletes.ts

import { cookies, headers } from "next/headers";

/**
 * Canonical types for coach-facing athlete data.
 * These MUST mirror the API response shape from:
 * /api/programs/[programId]/athletes
 */

export type CoachAthleteScore = {
  globalOverall: number;
  academicScore: number;
  performanceScore: number;
  availabilityScore: number;
  conductScore: number;
  coachableScore: number;
};

export type CoachAthlete = {
  programAthleteId: string;
  programId: string;
  athleteId: string;
  relationshipType: string;
  status: string | null;
  level: string | null;
  source: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  athlete: {
    id: string;
    firstName: string;
    lastName: string;
    gradYear: number;
    eventGroup: string | null;
    avatarUrl: string | null;
    gender: string | null;
    hsSchoolName: string | null;
    hsCity: string | null;
    hsState: string | null;
    hsCountry: string | null;
    isClaimed: boolean;
  };
  score: CoachAthleteScore | null;
};

export type GetProgramAthletesOptions = {
  q?: string;
  relationshipType?: string;
  status?: string;
  eventGroup?: string;
  gradYear?: number;
  includeScore?: boolean;
  limit?: number;
  offset?: number;
};

function buildCookieHeader(cookieStore: any): string {
  if (!cookieStore) return "";
  if (typeof cookieStore.getAll === "function") {
    return cookieStore
      .getAll()
      .map((c: any) => `${c.name}=${c.value}`)
      .join("; ");
  }
  return "";
}

async function getRequestOrigin(): Promise<string> {
  // Prefer an explicit env var when present (useful in background/server contexts)
  const envOrigin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.SITE_URL ||
    process.env.APP_URL;

  if (envOrigin) return envOrigin;

  const h = (await headers()) as any;
  const host =
    h.get?.("x-forwarded-host") ||
    h.get?.("host") ||
    h.get?.("x-forwarded-server");
  const proto = h.get?.("x-forwarded-proto") || "http";

  if (host) return `${proto}://${host}`;

  // Local dev fallback
  return "http://localhost:3000";
}

/**
 * Server-only helper.
 * Centralized DB → API contract consumer for coach-facing athlete lists.
 *
 * NOTE:
 * We call the internal Next.js API route (not a Supabase Edge Function) so that
 * the DB → API contract remains authoritative and we avoid duplicating query logic.
 */
export async function getProgramAthletes(
  programId: string,
  options: GetProgramAthletesOptions = {},
): Promise<CoachAthlete[]> {
  const cookieStore = (await cookies()) as any;
  const cookieHeader = buildCookieHeader(cookieStore);

  const params = new URLSearchParams();

  if (options.q) params.set("q", options.q);
  if (options.relationshipType)
    params.set("relationshipType", options.relationshipType);
  if (options.status) params.set("status", options.status);
  if (options.eventGroup) params.set("eventGroup", options.eventGroup);
  if (typeof options.gradYear === "number")
    params.set("gradYear", String(options.gradYear));

  if (options.includeScore) params.set("include", "score");
  if (options.limit) params.set("limit", String(options.limit));
  if (options.offset) params.set("offset", String(options.offset));

  const origin = await getRequestOrigin();
  const url = new URL(`/api/programs/${programId}/athletes`, origin);
  const qs = params.toString();
  if (qs) url.search = qs;

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[lib/athletes.getProgramAthletes] failed:", {
      status: res.status,
      statusText: res.statusText,
      body,
    });
    throw new Error("Failed to load program athletes");
  }

  const data = (await res.json()) as { programId: string; athletes: CoachAthlete[] };
  return data?.athletes ?? [];
}