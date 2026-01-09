import { NextResponse } from "next/server";
import { supabaseRouteClient } from "@/lib/supabase/route";
import { emitEvaluation, type RecruitingEmitArgs } from "@/lib/modules/recruiting/services/emitEvaluation";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RecruitingEmitArgs;

    if (!body?.programId) throw new Error("programId is required");
    if (!body?.recruitId) throw new Error("recruitId is required");
    if (!body?.inputsHash) throw new Error("inputsHash is required");
    if (!body?.resultPayload) throw new Error("resultPayload is required");

    const supabase = await supabaseRouteClient();
    const result = await emitEvaluation(supabase, body);

    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 400 });
  }
}
