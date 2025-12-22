import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const toErrorJson = (e: any) => {
    const out: any = {
      message: e?.message ?? String(e),
    };
    if (e?.name) out.name = e.name;
    if (e?.code) out.code = e.code;
    if (e?.details) out.details = e.details;
    if (e?.hint) out.hint = e.hint;
    if (e?.status) out.status = e.status;
    return out;
  };
  try {
    const body = await req.json().catch(() => ({}));

    const scope_type = body.scope_type ?? "global";
    const scope_id = body.scope_id ?? null;
    const reason = body.reason ?? "manual_recompute";
    const details_json = body.details_json ?? {};

    const { data, error } = await supabaseAdmin
      .from("performance_compute_queue")
      .insert([{ scope_type, scope_id, reason, details_json }])
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, job: data }, { status: 200 });
  } catch (e: any) {
    const errJson = toErrorJson(e);
    console.error("[/api/performance/compute/enqueue] Failed:", errJson);

    // Prefer 400 for predictable input/constraint failures; fall back to 500.
    const status =
      errJson.code === "23502" || // not_null_violation
      errJson.code === "23514" || // check_violation
      errJson.code === "23503" || // foreign_key_violation
      errJson.code === "P0001" || // raise exception
      errJson.code === "22P02" // invalid_text_representation
        ? 400
        : 500;

    return NextResponse.json(
      { ok: false, error: "enqueue_failed", err: errJson },
      { status }
    );
  }
}