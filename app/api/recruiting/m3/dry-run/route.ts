import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/app/lib/supabase/service";
import { runM3DryRun } from "@/app/lib/m3/dryRun";

type AdminKeyError = Error & { status?: number };

type DryRunRequestBody = {
  programId?: string | null;
  teamId?: string | null;
  horizon?: string | null;
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

    const body = (await req.json().catch(() => ({}))) as DryRunRequestBody;

    const programId: string | null = body?.programId ?? null;
    const teamId: string | null = body?.teamId ?? null;
    const horizon: string | null = body?.horizon ?? null;

    const supabase = getSupabaseServiceClient();
    const report = await runM3DryRun({ supabase, programId, teamId, horizon });

    return NextResponse.json(report, { status: 200 });
  } catch (e: unknown) {
    const status = errorStatus(e);
    return NextResponse.json({ ok: false, error: errorMessage(e) }, { status });
  }
}
