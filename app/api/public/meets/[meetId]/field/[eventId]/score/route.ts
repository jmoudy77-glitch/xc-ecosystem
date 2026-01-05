import { NextResponse } from "next/server";

function getBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ meetId: string; eventId: string }> }
) {
  const { meetId, eventId } = await params;
  const token =
    new URL(req.url).searchParams.get("token") ??
    getBearerToken(req) ??
    req.headers.get("x-ops-token");

  return NextResponse.json(
    {
      ok: false,
      error: "NOT_IMPLEMENTED",
      message:
        "Field scoring submission not implemented yet. Token validation and ingest will be added in ops token lifecycle + results pipeline implementation.",
      meetId,
      eventId,
      token_present: Boolean(token),
    },
    { status: 501 }
  );
}
