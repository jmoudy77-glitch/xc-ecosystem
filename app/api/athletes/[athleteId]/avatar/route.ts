// app/api/athletes/[athleteId]/avatar/route.ts

import { NextResponse } from "next/server";

/**
 * Temporary avatar endpoint to eliminate 405 console noise during Recruiting UI work.
 * - GET: returns 204 (no content) so <img> requests don't error.
 * - HEAD: mirrors GET behavior.
 *
 * This is intentionally non-prescriptive and does not attempt to infer avatar storage.
 */
export async function GET() {
  return new NextResponse(null, { status: 204 });
}

export async function HEAD() {
  return new NextResponse(null, { status: 204 });
}
