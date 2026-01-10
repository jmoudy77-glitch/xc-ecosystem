import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/app/lib/supabase/service";
import { runM3IsolationTest } from "@/app/lib/m3/isolationTest";

type AdminKeyError = Error & { status?: number };

type IsolationTestBody = {
  programId?: string | null;
  teamId?: string | null;
};

function requireAdminKey(req: Request) {
  const expected = process.env.M3_ADMIN_KEY;
  if (!expected) throw new Error("Missing env var: M3_ADMIN_KEY");

  const provided =
    req.headers.get("x-m3-admin-key") ?? req.headers.get("X-M3-ADMIN-KEY");

  if (!provided || provided !== expected) {
    const err: AdminKeyError = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
}

function errorStatus(e: unknown): number {
  if (typeof e === "object" && e && "status" in e) {
    const status = (e as { status?: number }).status;
    if (typeof status === "number") return status;
  }
  return 400;
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return "Unknown error";
}

export async function POST(req: Request) {
  try {
    requireAdminKey(req);

    const body = (await req.json().catch(() => ({}))) as IsolationTestBody;
    const programId: string | null = body?.programId ?? null;
    const teamId: string | null = body?.teamId ?? null;

    const supabase = getSupabaseServiceClient();
    const report = await runM3IsolationTest({ supabase, programId, teamId });

    return NextResponse.json(report, { status: report.ok ? 200 : 409 });
  } catch (e: unknown) {
    const status = errorStatus(e);
    return NextResponse.json({ ok: false, error: errorMessage(e) }, { status });
  }
}
