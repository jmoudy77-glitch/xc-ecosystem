import { NextResponse } from "next/server";
import { supabaseRouteClient } from "@/lib/supabase/route";
import { stabilizationExport } from "@/lib/modules/recruiting/services/stabilizationExport";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = await supabaseRouteClient();

    const data = await stabilizationExport(supabase, {
      programId: body.programId,
      sport: body.sport,
    });

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 400 });
  }
}
