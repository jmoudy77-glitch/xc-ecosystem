import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET: for testing in the browser
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Webhook endpoint is alive",
  });
}

// POST: for testing with curl
export async function POST() {
  return NextResponse.json({
    ok: true,
    message: "POST received",
  });
}
