// app/api/programs/[programId]/teams/[teamId]/seasons/[seasonId]/roster/import/suggest-mapping/route.ts

import { NextResponse } from "next/server";

type FieldKey =
  | "first_name"
  | "last_name"
  | "grad_year"
  | "event_group"
  | "jersey_number"
  | "status"
  | "scholarship_amount"
  | "scholarship_unit"
  | "notes"
  | "email";

type SuggestMappingRequest = {
  headers: string[];
  sampleRows?: string[][];
};

type SuggestMappingResponse = {
  mapping: Record<FieldKey, string | null>;
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[_\s]+/g, " ");
}

function findHeader(headers: string[], candidates: string[]): string | null {
  const normHeaders = headers.map(normalizeHeader);
  const normCandidates = candidates.map((c) => c.toLowerCase());

  // Exact, then "contains" match
  for (const cand of normCandidates) {
    const exactIdx = normHeaders.findIndex((h) => h === cand);
    if (exactIdx !== -1) return headers[exactIdx];

    const containsIdx = normHeaders.findIndex((h) => h.includes(cand));
    if (containsIdx !== -1) return headers[containsIdx];
  }

  return null;
}

function guessMapping(headers: string[]): Record<FieldKey, string | null> {
  return {
    first_name: findHeader(headers, ["first name", "first", "given name"]),
    last_name: findHeader(headers, ["last name", "last", "surname", "family name"]),
    grad_year: findHeader(headers, ["grad year", "graduation", "class year", "classof", "class of"]),
    event_group: findHeader(headers, ["event group", "group", "eventgroup"]),
    jersey_number: findHeader(headers, ["jersey", "jersey number", "number", "bib"]),
    status: findHeader(headers, ["status", "roster status"]),
    scholarship_amount: findHeader(headers, ["scholarship amount", "scholarship", "award"]),
    scholarship_unit: findHeader(headers, ["scholarship unit", "unit", "sch unit"]),
    notes: findHeader(headers, ["notes", "comments", "coach notes"]),
    email: findHeader(headers, ["email", "email address", "e-mail"]),
  };
}

// POST /api/programs/.../roster/import/suggest-mapping
export async function POST(req: Request) {
  let body: SuggestMappingRequest;
  try {
    body = (await req.json()) as SuggestMappingRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { headers } = body;

  if (!Array.isArray(headers) || headers.length === 0) {
    return NextResponse.json(
      { error: "headers must be a non-empty string array" },
      { status: 400 }
    );
  }

  const mapping = guessMapping(headers);

  const resp: SuggestMappingResponse = { mapping };
  return NextResponse.json(resp, { status: 200 });
}

/**
 * 🔮 LATER (AI UPGRADE):
 * - Replace `guessMapping` with a call to your AI layer:
 *   - Send target fields + header list + sample rows.
 *   - Get back JSON: { fieldKey -> headerName|null }.
 * - Keep the response shape identical so the frontend doesn't change.
 */