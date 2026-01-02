import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function isUuid(v: unknown): v is string {
  return (
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
  );
}

function isIdem(v: unknown): v is string {
  return typeof v === "string" && v.length >= 8 && v.length <= 128;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const firing_id = body?.firing_id;
  const idempotency_key = body?.idempotency_key;

  if (!isUuid(firing_id)) {
    return NextResponse.json({ error: "invalid_firing_id" }, { status: 400 });
  }
  if (idempotency_key !== undefined && idempotency_key !== null && !isIdem(idempotency_key)) {
    return NextResponse.json({ error: "invalid_idempotency_key" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("ops_start_schedule_firing", {
    p_firing_id: firing_id,
    p_idempotency_key: typeof idempotency_key === "string" ? idempotency_key : null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (data?.error) {
    const code =
      data.error === "firing_not_found" ? 404 :
      data.error === "schedule_not_found" ? 404 :
      data.error === "firing_not_started" ? 409 : 400;

    return NextResponse.json({ error: data.error, detail: data }, { status: code });
  }

  return NextResponse.json({ result: data }, { status: 200 });
}
